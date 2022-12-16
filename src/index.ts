/*
 * Code is based on https://developers.google.com/identity/protocols/oauth2/web-server#node.js
 */

import http from "node:http";
import { OAuth2Client } from "google-auth-library";
import { AddressInfo } from "node:net";
import url from "node:url";

class Future<T> {
  private resolver!: (value: T) => void; // readonly
  private rejecter!: (error: Error) => void; // readonly
  private _isCompleted: boolean = false;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolver = resolve;
      this.rejecter = reject;
    });
  }

  public readonly promise: Promise<T>;

  public get isCompleted(): boolean {
    return this._isCompleted;
  }

  public resolve(value: T): void {
    if (this._isCompleted) {
      return;
    }
    this._isCompleted = true;
    this.resolver(value);
  }

  public reject(error: Error): void {
    if (this._isCompleted) {
      return;
    }
    this._isCompleted = true;
    this.rejecter(error);
  }
}

export interface IFlow {
  /**
   * An authorization url that can be presented to the user to navigate and authenticate.
   * As a result we'll get a callback with an authorization code that we'll exchange onto a refresh token.
   */
  authorizeUrl: string;
  /**
   * Returns a refresh token (a returned Promise resolves as soon as user authenticates through the `authorizeUrl`).
   */
  getToken(): Promise<string>;
  /**
   * Returns a OAuthClient with set credentials.
   */
  getOAuthClient(): Promise<OAuth2Client>;
}

class Flow implements IFlow {
  authorizeUrl: string;
  oAuth2Client: OAuth2Client | undefined;
  future: Future<OAuth2Client>;

  constructor(authorizeUrl: string) {
    this.authorizeUrl = authorizeUrl;
    this.future = new Future<OAuth2Client>();
  }

  async getToken(): Promise<string> {
    let client = await this.future.promise;
    return client.credentials.refresh_token!;
  }

  getOAuthClient(): Promise<OAuth2Client> {
    return this.future.promise;
  }

  begin(oAuth2Client: OAuth2Client, authorizeUrl: string) {
    this.oAuth2Client = oAuth2Client;
    this.authorizeUrl = authorizeUrl;
  }

  async resolve(code: string) {
    const client = this.oAuth2Client;
    if (!client) throw new Error("OAuth2Client was not set");
    // Now that we have the code, use that to acquire tokens.
    const r = await client.getToken(code);
    // Make sure to set the credentials on the OAuth2 client.
    client.setCredentials(r.tokens);

    // Now we have a refresh_token and fully initialized OAuthClient, we can signal to the future
    this.future.resolve(client);
  }

  async reject(error: Error) {
    this.future.reject(error);
  }
}

export async function generateRefreshToken(
  client_id: string,
  client_secret: string,
  scope: string | string[]
): Promise<Flow> {
  const generator = new OAuthRefreshTokenGenerator(client_id, client_secret);
  return generator.getRefreshToken(scope);
}

export class OAuthRefreshTokenGenerator {
  static PORT = 8091;

  client_id: string;
  client_secret: string;
  server: http.Server | undefined;

  constructor(client_id: string, client_secret: string) {
    this.client_id = client_id;
    this.client_secret = client_secret;
  }

  async _onAuthCallback(
    req: http.IncomingMessage,
    res: http.OutgoingMessage,
    flow: Flow
  ) {
    try {
      let address = <AddressInfo>this.server?.address();
      if (!address) return;
      // acquire the code from the querystring, and close the web server.
      let qs = url.parse(req.url!, true).query;
      const code = <string>qs.code;
      const error = <string>qs.error;
      if (error) {
        //console.log(`An error returned: ${error}`);
        res.end("Authentication failed: " + error);
        this.closeServer();
        flow.reject(new Error(error));
      } else if (code) {
        //console.log(`Code is ${code}`);
        res.end("Authentication successful! Please return to the console.");
        this.closeServer();
        flow.resolve(code);
      } else {
        // no error nor code?
        // it might be a favicon request, ignoring
      }
    } catch (e: any) {
      this.closeServer();
      flow.reject(e);
    }
  }

  closeServer() {
    const server = this.server;
    if (server) {
      server.closeAllConnections();
      server.close();
    }
  }

  async getRefreshToken(scopes: string[] | string): Promise<Flow> {
    return new Promise((resolve, reject) => {
      (async () => {
        const flow = new Flow("");
        const server = http.createServer(async (req, res) =>
          this._onAuthCallback(req, res, flow)
        );
        this.server = server;
        let port = OAuthRefreshTokenGenerator.PORT;
        let wait = true;
        let signal: Future<void> | undefined;
        while (wait) {
          signal = new Future();
          // the idea of the loop with error/listen is to find a free port to listen on
          server.on("error", (e: any) => {
            if (e.code === "EADDRINUSE") {
              console.log(`port ${port} is in use, trying another one`);
              port++;
              server.close();
              signal!.resolve();
              // TODO: limit max attempts?
            }
          });
          server.listen(port, () => {
            wait = false;
            signal!.resolve();
            const oAuth2Client = new OAuth2Client(
              this.client_id,
              this.client_secret,
              encodeURI(`http://127.0.0.1:${port}`)
            );

            // Generate the url that will be used for the consent dialog.
            const authorizeUrl = oAuth2Client.generateAuthUrl({
              access_type: "offline",
              include_granted_scopes: true,
              scope: scopes,
            });
            flow.begin(oAuth2Client, authorizeUrl);

            resolve(flow);
          });
          await signal.promise;
        }
      })();
    });
  }
}

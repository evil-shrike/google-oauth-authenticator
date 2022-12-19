# google-oauth-authenticator

## Overview

The library allows you to integrate the process of acquiring of OAuth refresh token into you program.

Also it provides a CLI tool for generating refresh tokens.


## Usage

First we'll need a Desktop type OAuth credentials.
Go to https://console.cloud.google.com/apis/credentials and click "Create Credentials" -> OAuth client ID.
And select 'Desktop app' as application type.
Copy and save client id and client secret, or download secrets json file.

### CLI

Generate a refresh token using an exported client secrets json file of an OAuth credentials.
```
goauth get-token --secrets-file client_secrets.json --scope https://www.googleapis.com/auth/adwords
```

Generate a refresh token using client id and secret from OAuth credentials
```
goauth get-token --client-id XXX --client-secret YYY --scope https://www.googleapis.com/auth/adwords
```

You should specify either `secrets-file` or `client-id` and `client-secret`. In all cases it's required to specify a scope
 or multiple scopes (just repeat `scope` argument):

```
goauth get-token --secrets-file client_secrets.json --scope https://www.googleapis.com/auth/adwords --scope https://www.googleapis.com/auth/youtube
```

See all scopes here: https://developers.google.com/identity/protocols/oauth2/scopes


### Library

The main purpose of this package is to provide a library for integration authentication into desktop tools accessing Google APIs.

```js
  const flow = await generateRefreshToken(
    googleads_config_clientid,
    googleads_config_clientsecret,
    'https://www.googleapis.com/auth/adwords'
  );
  console.log('Navigate to the following url on the current machine:');
  console.log(chalk.cyan(flow.authorizeUrl));
  refresh_token = await flow.getToken();
  console.log('Successfully acquired a refresh token');
```

But please note that all this won't work if a tool is running remotely (e.g. via SSH), because google-oauth-authenticator opens a local loopback server and listening for redirect from the browser with a auth code.

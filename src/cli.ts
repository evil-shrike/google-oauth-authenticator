import chalk from 'chalk';
import fs from 'node:fs';
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { generateRefreshToken } from "./index.js";

const argv = yargs(hideBin(process.argv))
  .scriptName("goauth")
  .command(
    ["$0 get-token", "$0"],
    "Generate a refresh token",
    {
      "secrets-file": {
        alias: ["c", "client-secrets-path"],
        type: "string",
        description: "OAuth credentials file path",
      },
      "client-id": {
        type: "string",
        description: "OAuth client id",
      },
      "client-secret": {
        type: "string",
        description: "OAuth client secret",
      },
      scope: {
        array: true,
        type: "string",
        description: "OAuth scope(s) to request access to",
      },
    },
    (args) => onGetToken(args)
  )
  .example(
    "$0 get-token -c client_secrets.json",
    "Generate a refresh token using exported secrets file"
  )
  .strictCommands() // if unknown command, show help
  //.demandCommand(1, "") // if no command, raise failure
  .strict() // any command-line argument given that is not demanded, or does not have a corresponding description, will be reported as an error.
  .help()
  .parse();

async function onGetToken(argv: any) {
  let client_id = '';
  let client_secret = '';

  if (!argv.scope || !argv.scope.length) {
    console.error(
      chalk.red(
        'Please specify at least one scope (e.g. "--scope https://www.googleapis.com/auth/adwords")'
      )
    );
    process.exit(1);
  }
  if (argv.secretsFile) {
    if (!fs.existsSync(argv.secretsFile)) {
      console.error(chalk.red('The provided secrets file does not exist'));
      process.exit(1);
    }
    let secrets = JSON.parse(
        fs.readFileSync(argv.secretsFile, { encoding: "utf8" })
      );
    if (!secrets.installed) {
      console.error(
        chalk.red(
          "The secrets file provided looks to be for a non Desktop credentials, please make sure you're using credentials of Desktop type - https://console.cloud.google.com/apis/credentials"
        )
      );
      process.exit(1);
    }
    client_id = secrets.installed.client_id;
    client_secret = secrets.installed.client_secret;
  }
  else {
    client_id = argv.clientId;
    if (!client_id) {
      console.error(
        chalk.red(
          "Please specify client id (either in place via --client-id or as credentials file via --secrets-file)"
        )
      );
      process.exit(1);
    }
    client_secret = argv.clientSecret;
    if (!client_secret) {
      console.error(
        chalk.red(
          "Please specify client secret (either in place via --client-secret or as credentials file via --secrets-file)"
        )
      );
      process.exit(1);
    }
  }
  let flow = await generateRefreshToken(client_id, client_secret, argv.scope);
  console.log('Please navigate to the following url to authenticate:');
  console.log(flow.authorizeUrl);
  let token = await flow.getToken();
  console.log('You refresh token:');
  console.log(token);
}


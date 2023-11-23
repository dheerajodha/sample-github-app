// These are the dependencies for this file.
//
// You installed the `dotenv` and `octokit` modules earlier. The `@octokit/webhooks` is a dependency of the `octokit` module, so you don't need to install it separately. The `fs` and `http` dependencies are built-in Node.js modules.
import dotenv from "dotenv";
import {App} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import fs from "fs";
import http from "http";

// This reads your `.env` file and adds the variables from that file to the `process.env` object in Node.js.
dotenv.config();

// This assigns the values of your environment variables to local variables.
const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

// This reads the contents of your private key file.
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// This creates a new instance of the Octokit App class.
const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
    secret: webhookSecret
    },
});

// This defines the message that your app will add to issue comments.
const messageForNewComments = "This sentence is written by the GitHub App";

// This adds an event handler that your code will call later. When this event handler is called, it will log the event to the console. Then, it will use GitHub's REST API to edit a comment to the pull request that triggered the event.
async function handleIssueCommentCreated({octokit, payload}) {
    console.log(`Received a issue_comment event for the PR comment: #${payload.comment.html_url}`);
    console.log(`comment author's GH username: ${payload.comment.user.login}`)

    var updatedCommentBody = payload.comment.body + "\n" + messageForNewComments

    if (payload.comment.user.login == "dheerajodha") {
        try {
            await octokit.request("PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}", {
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                comment_id: payload.comment.id,
                body: updatedCommentBody,
                headers: {
                "x-github-api-version": "2022-11-28",
                },
            });
            } catch (error) {
            if (error.response) {
                console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
            }
            console.error(error)
        }
    }
};

// This sets up a webhook event listener. When your app receives a webhook event from GitHub with a `X-GitHub-Event` header value of `issue_comment` and an `action` payload value of `created`, it calls the `handleIssueCommentCreated` event handler that is defined above.
app.webhooks.on("issue_comment.created", handleIssueCommentCreated);

// This logs any errors that occur.
app.webhooks.onError((error) => {
    if (error.name === "AggregateError") {
        console.error(`Error processing request: ${error.event}`);
    } else {
        console.error(error);
    }
});

// This determines where your server will listen.
//
// For local development, your server will listen to port 3000 on `localhost`. When you deploy your app, you will change these values. For more information, see "[Deploy your app](#deploy-your-app)."
const port = 3000;
const host = 'localhost';
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

// This sets up a middleware function to handle incoming webhook events.
//
// Octokit's `createNodeMiddleware` function takes care of generating this middleware function for you. The resulting middleware function will:
//
//    - Check the signature of the incoming webhook event to make sure that it matches your webhook secret. This verifies that the incoming webhook event is a valid GitHub event.
//    - Parse the webhook event payload and identify the type of event.
//    - Trigger the corresponding webhook event handler.
const middleware = createNodeMiddleware(app.webhooks, {path});

// This creates a Node.js server that listens for incoming HTTP requests (including webhook payloads from GitHub) on the specified port. When the server receives a request, it executes the `middleware` function that you defined earlier. Once the server is running, it logs messages to the console to indicate that it is listening.
http.createServer(middleware).listen(port, () => {
    console.log(`Server is listening for events at: ${localWebhookUrl}`);
    console.log('Press Ctrl + C to quit.')
});

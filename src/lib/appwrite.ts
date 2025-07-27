import { Client, Account, ID } from 'appwrite';

const client = new Client();

client
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('687f8e78001ac206db80');

const account = new Account(client);

export { client, account, ID };
export default client;
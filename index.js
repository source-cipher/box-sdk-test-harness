const BoxSDK = require('box-node-sdk');
const crypto = require("crypto");
const jwt = require('jsonwebtoken')
const axios = require('axios')
const querystring = require('querystring');


const appConfig = {
  boxAppSettings: {
    clientID: process.env.CLIEND_ID,
    clientSecret: process.env.CLIEND_SECRET,
    appAuth: {
      keyID: process.env.KEY_ID,
      privateKey: process.env.PRIVATE_KEY,
      passphrase: process.env.PASSPHRASE
    }
  },
  enterpriseID: process.env.ENTERPRISE_ID
};

function getBoxClient(type, identifier) {
  const sdk = new BoxSDK(appConfig.boxAppSettings);
  return sdk.getAppAuthClient(type, identifier);;
};

async function addAppUser(externalAppUserId, appUserName) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const appUser = {
    is_platform_access_only: true,
    external_app_user_id: externalAppUserId,
    can_see_managed_users: false
  };

  const creationResponse = await box.enterprise.addAppUser(appUserName, appUser);
  
  return creationResponse;
};

async function getBoxAccessToken(appUserId) {

  const key = {
    key: appConfig.boxAppSettings.appAuth.privateKey,
    passphrase: appConfig.boxAppSettings.appAuth.passphrase
  };

  const authenticationUrl = 'https://api.box.com/oauth2/token';

  const claims = {
    iss: appConfig.boxAppSettings.clientID,
    sub: appUserId,
    box_sub_type: "user",
    aud: authenticationUrl,
    jti: crypto.randomBytes(64).toString("hex"),
    exp: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000) - 60,
    nbf: Math.floor(Date.now() / 1000) - 60
  };

  const keyId = appConfig.boxAppSettings.appAuth.keyID;

  const assertion = jwt.sign(claims, key, {
    algorithm: 'RS512',
    keyid: keyId
  });

  const accessToken = await axios.post(
    authenticationUrl,
    querystring.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion,
      client_id: appConfig.boxAppSettings.clientID,
      client_secret: appConfig.boxAppSettings.clientSecret
    })
  ).then(response => response.data);
  
  return accessToken;
};

async function getAndDeleteAllAppUsers() {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const allUsers = await box.enterprise.getUsers();

  console.log('User Count: ', allUsers.entries?.length);

  for (let i = 0; i < allUsers.entries.length; i++) {
    await box.users.delete(allUsers.entries[i].id, { force: true });
  }
};

async function createFolder(folderNameInput) {
  const folderName = folderNameInput || `test-${new Date().toISOString()}`;

  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const createResponse = await box.folders.create(rootFolder, folderName);

  return createResponse;
};

async function getFolder(folderId) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const folderResponse = await box.folders.get(folderId);
  
  return folderResponse;
};

async function addCollaborator(appUserId, folderId, collaborationRole) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const collaboration = await box.collaborations.createWithUserID(appUserId, folderId, collaborationRole);

  return collaboration;
};

async function removeCollaborator(collaborationId) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const collaboration = await box.collaborations.delete(collaborationId);

  return collaboration;
};

async function getFolderContents(folderId, offset = 0, limit = 50) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const contents = await box.folders.getItems(folderId, { offset, limit });

  return contents;
};

async function createNFolders(numberToCreate, parentFolderId) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  for (let i = 0; i < numberToCreate; i++) {
    await box.folders.create(parentFolderId, `${i}`);
  }
};

async function createWebhook(itemId, itemType, webhookUrl, webhookTriggers) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const res = await box.webhooks.create(itemId, itemType, webhookUrl, webhookTriggers);

  return res;
};

async function getAllWebhooks() {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const webhooks = await box.webhooks.getAll();

  return webhooks;
};

async function deleteAllWebhooks() {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const res = await box.webhooks.getAll( { limit: 1000 });

  for (let i = 0; i < res.entries.length; i++) {
    await box.webhooks.delete(res.entries[i].id);
  }
};

async function updateWebhook(webhookId, triggers, address) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const updateResponse = await box.webhooks.update(webhookId, {
    address,
    triggers
  });

  console.log(updateResponse);
};

async function deleteWebhook(webhookId) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const deleteResponse = await box.webhooks.delete(webhookId);

  console.log(deleteResponse);
};

async function getUser(appUserId) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const user = await box.users.get(appUserId, { fields: 'external_app_user_id,name'})

  return user;
};

async function deleteFolder(folderId, recursive = true) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  await box.folders.delete(folderId, { recursive })
};

async function deleteAllTrash() {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const trashResponse = await box.trash.get( { limit: 1000 });

  console.log('Total trash items loaded: ', trashResponse.total_count);

  const trashItems = trashResponse.entries;

  for (let i = 0; i < trashItems.length; i++) {
    if (trashItems[i].type === 'file') {
      await box.files.deletePermanently(trashItems[i].id)
    }

    if (trashItems[i].type === 'folder') {
      await box.folders.deletePermanently(trashItems[i].id)
    }
  }
};

async function getGroupCollaborations(groupId) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const groupCollabs = await box.groups.get(groupId);

  return groupCollabs;
};

async function createGroup(groupName, groupDescription) {
  const box = getBoxClient('enterprise', appConfig.enterpriseID);

  const group = await box.groups.create(groupName, { description: groupDescription} );

  return group;
};
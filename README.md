# NOAuth

NodeJS module for Electron. Hooks into an Electron app to add the ability to login and authenticate with Nintendo accounts

![example](https://i.imgur.com/dY8BIyf.png)

# Example
An example of an implementation of this library can be found in `./example`

# API

> ## NOAuth.wrapApp

Takes in an instance of `electron.app` and adds the custom protocol as well as the `app.NOAuth` method

> ## app.NOAuth

Starts the NOAuth authenication process. When finished, emits `nintendo_user_session` with the users full sessiion

> ## app.on('nintendo_user_session')

Exposes the users full session

> ## NOAuth.getBasicUserData

Takes in a nintendo user session and returns basic information about the user, such as their username and Miis

> ## NOAuth.getFriendList

Takes in a nintendo user session and returns the users friend list

# **NOTICE**
## **To make this library work, your `id_token` from the login session is sent over a third party API, to generate some required values. This token is in no way able to extract any kind of data alone, and is completely safe to send over the API. For more information on how this token is used, see https://github.com/frozenpandaman/splatnet2statink/wiki/api-docs**
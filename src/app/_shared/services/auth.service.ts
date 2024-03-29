import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';

import { User } from '../models/user.model';
import { ApiDataAuthService } from './api-data/api-data-auth.service';
import { CacheService } from './cache.service';
import { WebsocketService } from './websocket.service';
import { Subscriber } from 'rxjs/Subscriber';
import { ToolsService } from './tools.service';

import * as moment from 'moment';
import * as decode from 'jwt-decode';


@Injectable()
export class AuthService {

  loggedIn: boolean;
  loggedInUser: User;
  lastActivity: number;   // epoch time indicating last time there was any mouse click or keypress
  modalIsDisplayed: boolean;
  warnBeforeExpiration: number; // time in minutes before auto logout to display the warning modal
  confirmModalResponseSubscription: Subscription;

  constructor(
    private http: Http,
    private router: Router,
    private apiDataAuthService: ApiDataAuthService,
    private websocketService: WebsocketService,
    private toolsService: ToolsService,
    private cacheService: CacheService
  ) {

    // set the warning modal to appear x minutes before auto-logout
    this.warnBeforeExpiration = 5;
  }


  // method to check if user is logged in, used by the auth guard service
  isLoggedIn() {
    // if there is no token in local storage, the user is not logged in
    if (!localStorage.getItem('jarvisToken')) {
      // console.log('isLoggedIn returned false due to no token');
      return false;
    } else {
      // if the user is logged in and there is a token, make sure the token has not expired
      if (this.loggedIn && this.cacheService.token) {
        // if the token is expired, the user is not logged in
        if (this.tokenIsExpired()) {
          // console.log('isLoggedIn returned false due to token expired');
          return false;
        }
      } else {
        if (!this.loggedInUser) {
          // this means there is no data cached, so need to reach out to the server (page was refreshed)
          // TO-DO: make an call to the server to check the status of the token, and get the decoded user info, token expiration etc.
          // not sure if this is possible, or something we would need to do
        }
      }
    }
    // if didn't return false, user is logged in (using return early style)
    // console.log('isLoggedIn returned true');
    return true;
  }


  // setter method for the loggedIn property
  setLoggedIn(loggedIn: boolean) {
    this.loggedIn = loggedIn;
  }


  // TO-DO BILL: get rid of this; should be replaced by user resolver
  // get user information for components that need the data, to deal with scenario where there may or may not be user info in the cache
  getLoggedInUser(callback: (user: User, error?: string) => void): void {
    // console.log('getLoggedInUser method called');
    // if the data is already stored in memory, just return that
    if (this.loggedInUser) {
      // console.log('returning logged in user data from memory');
      callback(this.loggedInUser);
    // otherwise, need to get the data from the token
    } else {
      const token = localStorage.getItem('jarvisToken');
      if (token) {
        // console.log('logged in user does not exist in memory, getting from token instead');
        const t0 = performance.now();
        this.apiDataAuthService.getInfoFromToken(token)
          .subscribe(
            res => {
              const t1 = performance.now();
              // console.log(`get info from token took ${t1 - t0} milliseconds`);
              this.loggedInUser = new User().deserialize(res.jarvisUser);
              callback(this.loggedInUser);
            },
            err => {
              callback(undefined, 'error getting logged in user data from the token');
            }
          );
      }
    }
  }


  // this is invoked from the app component init (on app load / page refresh)
  // if there is no token in local storage or it is expired, make sure they are re-routed to the login page and it is cleard
  // if there is a valid token; refresh it to get a new expiration date and new user data just in case some info may have changed
  getInfoFromToken() {
    // console.log('get info from token started');
    // get the token from local storage
    const token = localStorage.getItem('jarvisToken');
    // if the token exists (if is doesn't the token constant will be set to null)
    if (token) {
      this.apiDataAuthService.getInfoFromToken(token)
        .subscribe(
          res => {
            // update the token info in memory
            this.cacheService.token = res.token;
            // console.log('token has been updated');
            // console.log(this.cacheService.token);
            // if the token is expired, clear the user data/cache (properties in this service) and token, and re-route to the login page
            if (this.tokenIsExpired()) {
              // console.log('logging out within getInfoFromToken function, due to expired token');
              this.logout(true);
            // if the token is not expired
            } else {
              // store the data in this service
              // console.log('within getInfoFromToken; token is valid');
              // this jarvis user will be the have the same data as in the token that was sent
              this.loggedInUser = new User().deserialize(res.jarvisUser);
              // console.log('get info from token; same logged in user');
              // console.log(this.loggedInUser);
              this.setLoggedIn(true);
              // reset the token
              // console.log('resetting the token');
              this.resetToken();
            }
            // TEMP CODE to log the token status
            this.logTokenStatus();
          },
          err => {
            // parse the error _body into an error object to access the info
            const error = JSON.parse(err.text());
            // check for token has expired error, just for logging (for now)
            if (error.error.hasOwnProperty('name') && error.error.hasOwnProperty('message') && error.error.hasOwnProperty('expiredAt')) {
              if (error.error.message === 'jwt expired') {
                // console.log(`jwt token expired at ${error.error.expiredAt}`);
              }
            }
            // regardless of the cause, clear the user data/cache (properties in this service) and token, and re-route to the login page
            // console.log('logging out within getInfoFromToken function, due to response error');
            this.logout(true);
          }
        );
    // if there is no 'jarvisToken' in local storage
    } else {
      // clear the user data/cache (properties in this service) and token, and re-route to the login page
      // console.log('logging out within getInfoFromToken function, due to no jarvisToken in local storage');
      this.logout(false);
    }

  }


  // this is executed when the timer is fired every minute
  // to either issue a new token with new expiration, auto log them out, ask them if they want to stay logged in w/ modal, or do nothing
  checkAuthStatus() {

    // don't execute this if the user is on the login page
    if (this.router.url === '/login') {
      return;
    }

    // get the number of minutes and seconds of inactivity (since the last mouse click or key press)
    const numInactivityMins = moment().diff(moment.unix(this.lastActivity), 'minutes');
    const numInactivitySeconds = moment().diff(moment.unix(this.lastActivity), 'seconds');

    // TEMP CODE: to test the timer is working properly
    // console.log(`checked auth status at: ${moment().format('dddd, MMMM Do YYYY, h:mm:ss a')}`);
    // console.log(`time since last activity: ${numInactivityMins} (minutes); ${numInactivitySeconds} (seconds)`);
    this.logTokenStatus();

    // if the token is expired, log the user out and display a message on the login page
    if (this.tokenIsExpired()) {
      // console.log('logging out within checkAuthStatus function, due to expired token');
      this.logout(true);

    // if there is a logged in user and there has been activity within the last 60 seconds
    // go the the server to get them a new token with pushed out expiration date
    // NOTE: the numInactivitySeconds or numInactivityMinutes should be synched with the timer interval in the app component
    } else if (this.loggedInUser && numInactivitySeconds < 60) {

      // reset the token
      this.resetToken();

    // if the token is about to expire, show a modal asking the user if they want to keep working/stay logged in
    } else if (this.tokenIsAboutToExpire()) {

      // only emit a message to the modal if it isn't already displayed
      if (!this.modalIsDisplayed) {
        this.displayExtendSessionModal();
        this.modalIsDisplayed = true;
      }

    }

  }

  // get a new token with a new expiration date and a new logged in user
  resetToken() {
    // console.log('attempting to get a new token with a new expiration date');
    const token = localStorage.getItem('jarvisToken');
    this.apiDataAuthService.resetToken(token)
      .subscribe(
        res => {
          // console.log(`reset token at: ${moment().format('dddd, MMMM Do YYYY, h:mm:ss a')}`);
          // update the token info in memory
          this.cacheService.token = res.token;
          // remove and reset the token in local storage
          this.clearToken();
          this.setToken(res.token.signedToken);
          // reset the timer so that it will be synched with the token expiration, at least within a second or two
          this.cacheService.resetTimer.emit(true);
          // this jarvis user will be the have the same data as in the token that was sent
          this.loggedInUser = new User().deserialize(res.jarvisUser);
          // console.log('get info from token; new logged in user');
          // console.log(this.loggedInUser);
          // TEMP CODE to log the token status
          this.logTokenStatus();
        },
        err => {
          console.error('reset token error:');
          console.error(err);
        }
      );
  }


  decodedToken(): any {
    if (this.cacheService.token) {
      return decode(this.cacheService.token.signedToken);
    } else {
      return undefined;
    }
  }


  // method to compare the timestamps and check to see whether the token expiration date has passed
  // NOTE: this method just uses the cached token data, doesn't need to make a call to the server to decode
  tokenIsExpired(): boolean {
    if (this.cacheService.token) {
      const expiringAt = moment.unix(this.cacheService.token.expiringAt);
      const now = moment();
      if (expiringAt.diff(now, 'seconds') <= 0) {
      // if (expiringAt.isSameOrAfter(now)) {
        return true;
      }
      return false;
    }
    return true;
  }


  // method to compare the timestamps to see if the token will expire in X minutes or less
  tokenIsAboutToExpire(): boolean {
    if (this.cacheService.token) {
      const expiringAt = moment.unix(this.cacheService.token.expiringAt);
      const now = moment();
      // console.log(`time to expiration: ${expiringAt.diff(now, 'minutes')} (minutes); ${expiringAt.diff(now, 'seconds')} (seconds)`);
      if (expiringAt.diff(now, 'seconds') <= this.warnBeforeExpiration * 60) {
        return true;
      }
      return false;
    }
    return false;
  }


  // get the token expiration datetime as a string (convert from unix epoch)
  tokenExpirationDate(): string {
    return moment.unix(this.cacheService.token.expiringAt).format('dddd, MMMM Do YYYY, h:mm:ss a');
  }


  // get the token issued datetime as a string (convert from unix epoch)
  tokenIssuedDate(): string {
    return moment.unix(this.cacheService.token.issuedAt).format('dddd, MMMM Do YYYY, h:mm:ss a');
  }


  // update the last activity property, which will be used to determine if the user should be auto-logged out after certain amount of time
  // NOTE: this is stored as unix epoch time (number) to be consistent with the expiringAt and issueAt times
  updateLastActivity() {
    // block the update if the extend user session modal is displayed
    if (!this.modalIsDisplayed) {
      this.lastActivity = moment().unix();
    }
    // console.log(`last activity has been updated to: ${moment.unix(this.lastActivity).format('dddd, MMMM Do YYYY, h:mm:ss a')}`);
  }


  // clear the data that is used to check for valid login without sending token to server
  // NOTE: we should use this cached data to implement the auth guard with no performance degradation
  // when changing the route to render new component/page.  we only need to sent the token to the server
  // on browser refresh, or when we want to reset the expiration date
  clearUserCache() {
    this.loggedIn = undefined;
    this.loggedInUser = undefined;
    this.cacheService.token = undefined;
  }


  // remove the token in local storage
  clearToken() {
    localStorage.removeItem('jarvisToken');
  }


  // store the token in local storage
  setToken(token: any) {
    localStorage.setItem('jarvisToken', token);
    // sessionStorage.setItem('jarvisToken', token);
  }


  clearLoggedInUserOnServer() {

    // make an api call to clear the user from the server cache (loggedInUsers array)
    if (this.loggedInUser) {

      // send the logged in user object to all other clients via websocket
      this.websocketService.sendLoggedOutUser(this.loggedInUser);

      this.apiDataAuthService.logout(this.loggedInUser.userName)
        .subscribe(
          res => {
            // console.log('success on logout from the auth service');
            // console.log(res);
          },
          err => {
            // console.error('error on logout from the auth service');
          }
        );
    }

  }


  logout(displayMessage: boolean) {
    this.clearLoggedInUserOnServer();
    this.clearUserCache();
    this.clearToken();
    this.cacheService.appLoadPath = undefined;
    this.routeToLogin(displayMessage);
  }


  // route to the login component/page (for manual or automatic logout)
  routeToLogin(displayMessage: boolean) {

    // don't re-route if the user is already on the login page
    if (this.router.url !== '/login' && this.router.url !== '/') {

      // hide the extend session modal if it is displayed
      if (this.modalIsDisplayed) {
        // console.log('hiding extend session modal');
        this.hideExtendSessionModal();
        this.modalIsDisplayed = undefined;
      }

      // re-route to the login page
      this.router.navigate(['/login']);

      // display a message on the login screen explaining that they were logged out automatically
      if (displayMessage) {
        this.cacheService.autoLogout$ = {
          message: 'For security you have been logged out',
          iconClass: 'fa-info-circle',
          iconColor: 'rgb(87, 168, 255)'
        };
      }

    }

  }


  // TEMP CODE: to log the token status
  logTokenStatus() {
    if (this.cacheService.token) {
      // console.log(`token was issued at: ${this.tokenIssuedDate()}; expiring at: ${this.tokenExpirationDate()}`);
    }
  }


  displayExtendSessionModal() {

    // emit a message (object) to the confirm modal component with the title, message, etc. and tell it to display
    this.cacheService.confirmModalData.emit(
      {
        title: 'Logout Warning',
        message: `We haven't heard from you in awhile.  For security you will be logged out in
          ${this.toolsService.numberToWord(this.warnBeforeExpiration)} minutes.  Do you want to remain logged in?`,
        iconClass: 'fa-exclamation-triangle',
        iconColor: 'rgb(193, 27, 27)',
        closeButton: false,
        allowOutsideClickDismiss: false,
        allowEscKeyDismiss: false,
        buttons: [
          {
            text: 'Yes',
            bsClass: 'btn-success',
            emit: true
          },
          {
            text: 'No',
            bsClass: 'btn-secondary',
            emit: false
          }
        ]
      }
    );

    // after emitting the modal, listen for the response
    this.confirmModalResponseSubscription = this.cacheService.confirmModalResponse.subscribe( res => {
      if (res) {
        this.resetToken();
      } else {
        // console.log('logging out within displayExtendSessionModal, due to response received false (no button');
        this.logout(false);
      }
      this.modalIsDisplayed = undefined;
      this.confirmModalResponseSubscription.unsubscribe();
    });
  }



  hideExtendSessionModal() {
    // emit a message (object) to the confirm modal component to hide it
    this.cacheService.confirmModalClose.emit(true);
  }

}

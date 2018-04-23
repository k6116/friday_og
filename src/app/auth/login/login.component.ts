import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { ApiDataService } from '../../_shared/services/api-data.service';
import { AppDataService } from '../../_shared/services/app-data.service';
import { AuthService } from '../auth.service';
import { ToolsService } from '../../_shared/services/tools.service';
import { User } from '../../_shared/models/user.model';

import * as moment from 'moment';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  // view childs are set up for the user name and password inputs so the focus() method can be used
  // tied to #userNameVC and #passwordVC in the html
  @ViewChild('userNameVC') userNameVC: ElementRef;
  @ViewChild('passwordVC') passwordVC: ElementRef;

  // properties used for two way binding, with ngModel
  userName: string;
  password: string;

  // properties used for the error message display (invalid login etc.)
  loginMessage: string;
  loginSuccess: boolean;
  showMessage: boolean;
  iconClass: string;
  iconColor: string;

  // subscriptions
  subscription1: Subscription;

  constructor(
    private router: Router,
    private apiDataService: ApiDataService,
    private appDataService: AppDataService,
    private authService: AuthService,
    private toolsService: ToolsService
  ) { }

  ngOnInit() {

    // set the focus on the user name input
    this.userNameVC.nativeElement.focus();

    // check for the autoLogout object; if it exists display the message
    if (this.appDataService.autoLogout$) {
      const autoLogout = this.appDataService.autoLogout$;
      this.displayMessage(autoLogout.message, autoLogout.iconClass, autoLogout.iconColor);
    }

  }

  ngOnDestroy() {
  }

  onLoginClick() {

    // reset and hide the error message if any is already displayed
    this.resetErrorMessage();

    // check for form entry errors (missing user name or password)
    if (this.hasFormEntryErrors()) {
      this.displayFormEntryErrors();
      return;
    }

    // construct a user/login object that will be passed in the request body
    const user = {
      userName: this.userName,
      password: this.password
    };

    // start timer for authentication time
    const t0 = performance.now();

    // call the api data service to authenticate the user credentials
    this.apiDataService.authenticate(user)
      .subscribe(
        res => {

          // log the time it took to authenticate
          this.logAuthPerformance(t0);

          // TEMP CODE: to log the response
          console.log('authentication was successfull:');
          console.log(res);

          // store data in the auth service related to the logged in user
          this.authService.loggedInUser = new User().deserialize(res.jarvisUser);
          // this.authService.loggedInUser = new User(res.jarvisUser);
          this.authService.token = res.token;
          this.authService.setLoggedIn(true);

          // store the jwt token in local storage
          localStorage.setItem('jarvisToken', res.token.signedToken);
          // sessionStorage.setItem('jarvisToken', res.token.signedToken);

          // reset the timer so that it will be synched with the token expiration, at least within a second or two
          this.appDataService.resetTimer.emit(true);

          // clear the autologout object
          this.appDataService.autoLogout$ = undefined;

          // get and store nested org data for this user, in anticipation of use and for performance
          // this.getNestedOrgData(res.jarvisUser.email);
          this.getNestedOrgData('ron_nersesian@keysight.com');

          // route to the main page
          this.router.navigateByUrl('/main/fte-entry/employee');

        },
        err => {

          // log the time it took to authenticate
          this.logAuthPerformance(t0);

          // TEMP CODE to log the response (error)
          console.log('authentication failed:');
          console.log(err);

          // display the appropriate message depending on the type of error (timeout, invalid credentials, etc.)
          this.handleErrorMessage(err);

        }
      );
  }


  // reset and hide the error message
  resetErrorMessage() {
    this.loginMessage = undefined;
    this.showMessage = false;
  }

  // simple check for form entry error (missing either user name or password or both)
  hasFormEntryErrors(): boolean {
    if (!this.userName || !this.password) {
      return true;
    }
  }

  // display error message and icon for missing username or password, also set focus for the user for convenience
  displayFormEntryErrors() {
    if (!this.userName && !this.password) {
      this.displayMessage('Please enter your user name and password', 'fa-exclamation-triangle', 'rgb(139, 0, 0)');
      this.userNameVC.nativeElement.focus();
    } else if (!this.userName) {
      this.displayMessage('Please enter your user name', 'fa-exclamation-triangle', 'rgb(139, 0, 0)');
      this.userNameVC.nativeElement.focus();
    } else if (!this.password) {
      this.displayMessage('Please enter your password', 'fa-exclamation-triangle', 'rgb(139, 0, 0)');
      this.passwordVC.nativeElement.focus();
    }
  }

  // TEMP CODE to log the total time it took to authenticate
  logAuthPerformance(t0: number) {
    const t1 = performance.now();
    console.log(`authentication took ${t1 - t0} milliseconds`);
  }

  // display authentication error or success message
  displayMessage(message: string, iconClass: string, iconColor: string) {
    this.loginMessage = message;
    this.iconClass = iconClass;
    this.iconColor = iconColor;
    this.showMessage = true;
  }

  // for an error response, check for various types or errors and display the appropriate message
  handleErrorMessage(err: any) {
    // check for no response (net::ERR_CONNECTION_REFUSED etc.)
    if (err.status === 0) {
      this.displayMessage('Server is not responding', 'fa-exclamation-triangle', 'rgb(139, 0, 0)');
    // check for timeout error
    } else if (err.hasOwnProperty('name')) {
      if (err.name === 'TimeoutError') {
        this.displayMessage('Server timed out', 'fa-exclamation-triangle', 'rgb(139, 0, 0)');
      }
    // otherwise, this should be a failed login (invalid credentials)
    } else {
      this.displayMessage('Invalid user name or password', 'fa-exclamation-triangle', 'rgb(139, 0, 0)');
    }
  }

  // get and store the nested org data upon successfull login
  getNestedOrgData(email: string) {
    this.appDataService.nestedOrgDataRequested = true;
    this.apiDataService.getOrgData(email)
    .subscribe(
      res => {
        const nestedOrgData = JSON.parse('[' + res[0].json + ']');
        // console.log('nested org object');
        // console.log(nestedOrgData);
        this.appDataService.$nestedOrgData = nestedOrgData;
        this.appDataService.nestedOrgData.emit(nestedOrgData);
      },
      err => {
        console.log('error getting nested org data');
      }
    );
  }


}

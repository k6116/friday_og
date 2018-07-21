import { Injectable } from '@angular/core';
import { Http, Headers, Response, RequestOptions, ResponseContentType } from '@angular/http';
import { Observable } from 'rxjs/observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { CacheService } from '../cache.service';
import { AuthService } from '../auth.service';
import 'rxjs/add/operator/map';

@Injectable()
export class ApiDataDashboardService {

  constructor(
    private http: Http,
    private cacheService: CacheService,
    private authService: AuthService
  ) { }


  getDashboardData(startDate: string, endDate: string, userName: string, employeeID: number): Observable<any> {

    // NOTE: email is passed here instead of id as the key since it gets data from the plm databridge as well as jarvis
    const fteData = this.http.get(`/api/dashboard/getFTEData/${startDate}/${endDate}
      ?token=${this.authService.token.signedToken}`)
      .timeout(this.cacheService.apiDataTimeout)
      .map((response: Response) => response.json());

    const firstLogin = this.http.get(`/api/dashboard/checkFirstLogin/${employeeID}/${userName}
      ?token=${this.authService.token.signedToken}`)
      .timeout(this.cacheService.apiDataTimeout)
      .map((response: Response) => response.json());

    const projectRequests = this.http.get(`/api/dashboard/checkProjectRequests/${employeeID}
      ?token=${this.authService.token.signedToken}`)
      .timeout(this.cacheService.apiDataTimeout)
      .map((response: Response) => response.json());

    const jobTitle = this.http.get(`/api/dashboard/checkJobTitle/${employeeID}
      ?token=${this.authService.token.signedToken}`)
      .timeout(this.cacheService.apiDataTimeout)
      .map((response: Response) => response.json());

    return forkJoin([fteData, firstLogin, projectRequests, jobTitle]);

  }



}

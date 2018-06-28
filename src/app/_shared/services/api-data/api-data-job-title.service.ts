import { Injectable } from '@angular/core';
import { Http, Headers, Response, RequestOptions, ResponseContentType } from '@angular/http';
import { AppDataService } from '../app-data.service';


@Injectable()
export class ApiDataJobTitleService {

  timeout: number;

  constructor(
    private http: Http,
    private appDataService: AppDataService
  ) { }

  getJobTitleList() {
    return this.http.get(`/api/indexJobTitle/`)
    .timeout(this.appDataService.apiDataTimeout)
    .map((response: Response) => response.json());
  }

  updateJobTitle(userID: number, jobTitles: any) {
    const headers = new Headers({'Content-Type': 'application/json'});
    const options = new RequestOptions({headers: headers});
    return this.http.post(`/api/updateJobTitle/${userID}`, JSON.stringify(jobTitles), options)
      .timeout(this.appDataService.apiDataTimeout)
      .map((response: Response) => response.json());
  }


}
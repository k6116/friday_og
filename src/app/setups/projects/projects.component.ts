import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApiDataService } from '../../_shared/services/api-data.service';
import { AppDataService } from '../../_shared/services/app-data.service';
import { AuthService } from '../../auth/auth.service';
import { ProjectsEditModalComponent } from '../../modals/projects-edit-modal/projects-edit-modal.component';
import { ProjectsCreateModalComponent } from '../../modals/projects-create-modal/projects-create-modal.component';
import { User } from '../../_shared/models/user.model';

@Component({
  selector: 'app-projects-setups',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css', '../../_shared/styles/common.css'],
})
export class ProjectsSetupsComponent implements OnInit {

  projectName: string;
  projectType: number;
  projectDescription: string;
  projectList: any;
  projectData: any;
  projectAccessRequestsList: any;
  loggedInUser: User;
  showProjectsEditModal: boolean;
  showProjectsCreateModal: boolean;
  display: boolean;
  editToggle: boolean;
  alertToggle: boolean;
  cardNPI: any;

  @ViewChild(ProjectsCreateModalComponent) projectsCreateModalComponent;
  @ViewChild(ProjectsEditModalComponent) projectsEditModalComponent;

  constructor(
    private apiDataService: ApiDataService,
    private appDataService: AppDataService,
    private authService: AuthService,
  ) {
    // this.display = true;
  }

  ngOnInit() {
    // get logged in user's info
    this.authService.getLoggedInUser((user, err) => {
      if (err) {
        console.log(`error getting logged in user: ${err}`);
        return;
      }
      this.loggedInUser = user;
      this.getUserProjectList();
      this.getProjectAccessRequestsList();
    });
    // toggle edit view in collapse header
    this.editToggle = false;
    this.alertToggle = false;
  }

  selectProject(project: any) {
    this.showProjectsEditModal = true;
    this.projectData = project;
    setTimeout(() => {
      this.projectsEditModalComponent.populateForm();
    }, 0);
  }

  getUserProjectList() {
    this.apiDataService.getUserProjectList(this.loggedInUser.id)
      .subscribe(
        res => {
          console.log('Project List: ', res);
          this.projectList = res;
        },
        err => {
          console.log(err);
        }
      );
  }

  getProjectAccessRequestsList() {
    this.apiDataService.getProjectAccessRequestsList(this.loggedInUser.id)
      .subscribe(
        res => {
          // console.log(res);
          this.projectAccessRequestsList = res;
        },
        err => {
          console.log(err);
        }
      );
  }

  createProject() {
    this.showProjectsCreateModal = true;
    setTimeout(() => {
      this.projectsCreateModalComponent.resetForm();
    }, 0);
  }

  onCreateSuccess() {
    console.log('Create project success. My Project List Refreshed');
    this.getUserProjectList();
  }

  onUpdateSuccess() {
    console.log('Update project success. My Project List Refreshed');
    this.getUserProjectList();
  }

  onDeleteSuccess() {
    console.log('Delete project success. My Project List Refreshed');
    this.getUserProjectList();
  }

  onCollapseClick() {
    console.log('Collapse clicked, Toggle', this.editToggle);
    if (this.editToggle = true) {
      this.editToggle = false;
    }
    // this.editToggle = !this.editToggle;
  }

  onEditButtonClick() {
    console.log('Pencil button clicked, toggle', this.editToggle);
    this.editToggle = !this.editToggle;
  }

  requestResponse(request: any, reply: string) {
    this.apiDataService.responseProjectAccessRequest(request, reply, this.loggedInUser.id)
      .subscribe(
        res => {
          console.log(res);
        },
        err => {
          console.log(err);
        }
      );
    this.alertToggle = !this.alertToggle;
  }

  getCardInfo() {
    this.cardNPI = [
      {
        title: 'Project Status',
        alias: 'projectStatus',
        value: this.projectList
      },
      {
        title: 'Oracle Item Number',
        alias: 'projectStatus'
      },
      {
        title: 'Project Number',
        alias: 'projectNumber'
      },
      {
        title: 'Priority',
        alias: 'priority'
      },
      {
        title: 'IBO',
        alias: 'ibo'
      },
      {
        title: 'MU',
        alias: 'mu'
      },
      {
        title: 'Organization',
        alias: 'organization'
        },
        {
          title: 'Notes',
          alias: 'notes'
        },
        {
          title: 'Description',
          alias: 'description'
        },

    ];
  }

}

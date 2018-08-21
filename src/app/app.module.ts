
// MODULES
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { NouisliderModule } from 'ng2-nouislider';
import { ClickOutsideModule } from 'ng4-click-outside';
import { Ng2CompleterModule } from 'ng2-completer';

// ANGULAR MATERIAL MODULES
import { MatSlideToggleModule, MatButtonModule, MatCheckboxModule, MatExpansionModule, MatProgressSpinnerModule } from '@angular/material';

// DIRECTIVES
import { AutofocusDirective } from './_shared/directives/autofocus.directive';
import { FteInputRestrictDirective } from './_shared/directives/fte-input-restrict.directive';
import { ClickOutsideDirective } from './_shared/directives/click-outside.directive';

// PIPES
import { SafeHtmlPipe } from './_shared/pipes/safe-html.pipe';
import { FilterPipe } from './_shared/pipes/filter.pipe';
import { ProjectTypePipe } from './_shared/pipes/project-type.pipe';
import { TitleCasePipe } from '@angular/common';
import { ProjectsFilterPipe } from './_shared/pipes/projects-filter.pipe';

// SERVICES
import { CacheService, ClickTrackingService, CookiesService,
  ToolsService, UserResolverService, WebsocketService } from './_shared/services/_index';
import { AuthService } from './_shared/services/auth.service';
import { ApiDataAuthService, ApiDataClickTrackingService, ApiDataEmailService, ApiDataEmployeeService,
  ApiDataFteService, ApiDataJobTitleService, ApiDataMetaDataService, ApiDataOrgService, ApiDataPermissionService, ApiDataProjectService,
  ApiDataReportService, ApiDataDashboardService, ApiDataSchedulesService,
  ApiDataPartService, ApiDataAnalyticsService, ApiDataBomService} from './_shared/services/api-data/_index';

// GUARDS
import { AuthGuardService } from './_shared/guards/auth.guard';
import { UnsavedChangesGuard } from './_shared/guards/unsaved-changes.guard';
import { BrowserGuard } from './_shared/guards/browser.guard';
import { PermissionsGuard } from './_shared/guards/permissions.guard';
import { FteEntryGuard } from './fte-entry/employee/fte-entry.guard';

// CHARTS
import 'hammerjs';
import 'chartjs-plugin-zoom';
import { TreeModule } from 'ng2-tree';

// COMPONENTS
import { AppComponent } from './app.component';
import { LoginComponent } from './auth/login/login.component';
import { MainComponent } from './main/main.component';
import { NoticeModalComponent } from './modals/notice-modal/notice-modal.component';
import { ConfirmModalComponent } from './modals/confirm-modal/confirm-modal.component';
import { FteEntryEmployeeComponent } from './fte-entry/employee/fte-entry.component';
import { FteEntryTeamComponent } from './fte-entry/team/fte-entry.component';
import { TopNavComponent } from './navs/top-nav/top-nav.component';
import { SideNavComponent } from './navs/side-nav/side-nav.component';
import { TopProjectsReportsComponent } from './reports/top-projects/top-projects.component';
import { EmployeesReportsComponent } from './reports/employees/employees.component';
import { ProfileModalComponent } from './modals/profile-modal/profile-modal.component';
import { ProjectsModalComponent } from './modals/projects-modal/projects-modal.component';
import { TestComponent } from './test/test.component';
import { OrgDropdownComponent } from './reports/team-fte-summary/org-dropdown/org-dropdown.component';
import { ProjectsEditModalComponent } from './modals/projects-edit-modal/projects-edit-modal.component';
import { ProjectsCreateModalComponent } from './modals/projects-create-modal/projects-create-modal.component';
import { ChartsModule } from 'ng2-charts';
import { ToastComponent } from './toast/toast.component';
import { BlockAppUseComponent } from './block-app-use/block-app-use.component';
import { PerformanceComponent } from './performance/performance.component';
import { ProgressBarComponent } from './_shared/components/progress-bar/progress-bar.component';
import { ProgressSpinnerComponent } from './_shared/components/progress-spinner/progress-spinner.component';
import { ChatComponent } from './chat/chat.component';
import { MyFteSummaryComponent } from './reports/my-fte-summary/my-fte-summary.component';
import { TeamFteSummaryComponent } from './reports/team-fte-summary/team-fte-summary.component';
import { TopProjectsBubbleComponent } from './reports/top-projects-bubble/top-projects-bubble.component';
import { JobTitlesComponent } from './admin/job-titles/job-titles.component';
import { AdminComponent } from './admin/admin.component';
import { ProjectAttributesComponent } from './admin/project-attributes/project-attributes.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FooterComponent } from './footer/footer.component';
import { ProjectsSetupsComponent } from './setups/projects/projects.component';
import { CarouselModalComponent } from './modals/carousel-modal/carousel-modal.component';
import { PartSetupComponent } from './setups/parts/parts.component';
import { SupplyDemandComponent } from './reports/supply-demand/supply-demand.component';
import { Error403Component } from './error-pages/error-403/error-403.component';
import { BomEditorComponent } from './reports/bom-editor/bom-editor.component';
import { BomViewerComponent } from './reports/bom-viewer/bom-viewer.component';
import { SearchProjectsComponent } from './projects/search-projects/search-projects.component';
import { MyProjectsComponent } from './projects/my-projects/my-projects.component';
import { ProjectRequestsComponent } from './projects/project-requests/project-requests.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AutofocusDirective,
    MainComponent,
    NoticeModalComponent,
    ConfirmModalComponent,
    SafeHtmlPipe,
    ProjectsFilterPipe,
    FteInputRestrictDirective,
    FteEntryEmployeeComponent,
    FteInputRestrictDirective,
    TopNavComponent,
    SideNavComponent,
    TopProjectsReportsComponent,
    EmployeesReportsComponent,
    MyProjectsComponent,
    FteEntryTeamComponent,
    ProfileModalComponent,
    ProjectsModalComponent,
    FilterPipe,
    ProjectTypePipe,
    TestComponent,
    OrgDropdownComponent,
    ProjectsEditModalComponent,
    ProjectsCreateModalComponent,
    ToastComponent,
    BlockAppUseComponent,
    PerformanceComponent,
    ProgressBarComponent,
    ProgressSpinnerComponent,
    ClickOutsideDirective,
    ChatComponent,
    MyFteSummaryComponent,
    TeamFteSummaryComponent,
    TopProjectsBubbleComponent,
    JobTitlesComponent,
    AdminComponent,
    ProjectAttributesComponent,
    FooterComponent,
    DashboardComponent,
    FooterComponent,
    ProjectsSetupsComponent,
    CarouselModalComponent,
    SupplyDemandComponent,
    Error403Component,
    PartSetupComponent,
    BomEditorComponent,
    BomViewerComponent,
    ProjectRequestsComponent,
    SearchProjectsComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    NouisliderModule,
    ClickOutsideModule,
    ChartsModule,
    Ng2CompleterModule,
    TreeModule
  ],
  providers: [
    ApiDataAuthService,
    ApiDataClickTrackingService,
    ApiDataEmailService,
    ApiDataEmployeeService,
    ApiDataFteService,
    ApiDataJobTitleService,
    ApiDataMetaDataService,
    ApiDataOrgService,
    ApiDataPermissionService,
    ApiDataProjectService,
    ApiDataReportService,
    ApiDataDashboardService,
    ApiDataSchedulesService,
    ApiDataPartService,
    ApiDataAnalyticsService,
    ApiDataBomService,
    CacheService,
    AuthService,
    AuthGuardService,
    ToolsService,
    ClickTrackingService,
    UserResolverService,
    WebsocketService,
    CookiesService,
    UnsavedChangesGuard,
    BrowserGuard,
    PermissionsGuard,
    FteEntryGuard,
    TitleCasePipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

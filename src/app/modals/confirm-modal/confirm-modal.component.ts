import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { AppDataService } from '../../_shared/services/app-data.service';

declare var $: any;


@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.css'],
  encapsulation: ViewEncapsulation.Emulated
})
export class ConfirmModalComponent implements OnInit, OnDestroy {

  modal: any;
  subscription1: Subscription;
  subscription2: Subscription;

  constructor(
    private appDataService: AppDataService
  ) { }


  ngOnInit() {

    this.subscription1 = this.appDataService.confirmModalData.subscribe(
      (object: any) => {
        // set the modal property (object) which will have all the info to render the modal (title, buttons, etc.)
        this.modal = object;
        // display the modal
        $('#confirm-modal').modal({
          backdrop: this.modal.allowOutsideClickDismiss ? true : 'static',
          keyboard: this.modal.allowEscKeyDismiss
        });
    });

    this.subscription2 = this.appDataService.confirmModalClose.subscribe(
      (close: boolean) => {
        // close the modal (regardless of the value, but by convention should pass true)
        console.log('disposing of the confirm modal');
        $('#confirm-modal').modal('hide');
    });

  }

  ngOnDestroy() {
    this.subscription1.unsubscribe();
  }

  onModalButtonClick(emit) {
    this.appDataService.confirmModalResponse.emit(emit);
  }


}

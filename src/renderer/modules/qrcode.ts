export class QRCodeManager {
  private container: HTMLElement;
  
  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(message: string) {
    this.container.textContent = message;
    this.container.classList.add('show');
  }
  
  hide() {
    this.container.classList.remove('show');
    this.container.textContent = '';
  }
} 
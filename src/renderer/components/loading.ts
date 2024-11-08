export class LoadingUI {
  private element: HTMLDivElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'loading-overlay';
    this.element.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text"></div>
    `;
    document.body.appendChild(this.element);
  }

  show(text: string = '加载中...') {
    const textElement = this.element.querySelector('.loading-text');
    if (textElement) {
      textElement.textContent = text;
    }
    this.element.style.display = 'flex';
  }

  hide() {
    this.element.style.display = 'none';
  }
} 
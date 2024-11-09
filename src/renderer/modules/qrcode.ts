export class QRCodeManager {
    private container: HTMLElement;
    private qrcodeImage: HTMLImageElement;
    private statusText: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        
        // 创建二维码图片元素
        this.qrcodeImage = document.createElement('img');
        this.qrcodeImage.className = 'qrcode-image';
        
        // 创建状态文本元素
        this.statusText = document.createElement('div');
        this.statusText.className = 'status';
        this.statusText.textContent = '请使用微信扫描二维码登录';
        
        // 添加到容器
        this.container.appendChild(this.qrcodeImage);
        this.container.appendChild(this.statusText);

        // 监听二维码事件
        window.electronAPI.onQrcodeGenerated((qrcode: string) => {
            this.show(qrcode);
        });
    }

    show(qrcodeData: string) {
        // 设置二维码图片
        this.qrcodeImage.src = qrcodeData;
        // 显示容器
        this.container.classList.add('show');
        console.log('QR code displayed');
    }

    hide() {
        // 隐藏容器
        this.container.classList.remove('show');
        // 清除二维码图片
        this.qrcodeImage.src = '';
        console.log('QR code hidden');
    }

    updateStatus(status: string) {
        this.statusText.textContent = status;
    }
} 
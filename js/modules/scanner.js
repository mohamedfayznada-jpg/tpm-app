// مسار الملف: js/modules/scanner.js
import { UI } from '../utils/ui.js';

let sessionScannedBarcodes = new Set(); // ذاكرة مؤقتة لمنع التكرار

export const Scanner = {
    async scanBarcodeFromImage(event) {
        const file = event.target.files[0];
        if (!file) return;

        UI.showToast('جاري قراءة الباركود... 🔍');
        const html5QrCode = new Html5Qrcode("searchResults"); 
        
        try {
            const decodedText = await html5QrCode.scanFile(file, true);
            
            // حماية التكرار (Poka-Yoke)
            if (sessionScannedBarcodes.has(decodedText)) {
                UI.showToast('⚠️ تحذير: تم مسح هذا الباركود مسبقاً!');
                document.getElementById('searchResults').style.display = 'block';
                document.getElementById('searchResults').innerHTML = `
                    <div style="padding:20px; background:rgba(198,40,40,0.1); border:1px solid var(--danger); border-radius:15px; text-align:center;">
                        <div style="font-size:30px; margin-bottom:10px;">🛑</div>
                        <b class="danger-text" style="font-size:16px;">باركود مكرر (مرفوض)</b><br>
                        <div style="margin-top:10px; font-size:12px; color:var(--text-muted);">
                            البيانات: ${decodedText}
                        </div>
                        <div class="row-flex" style="margin-top:15px; justify-content:center;">
                            <button class="btn btn-sm btn-danger flex-1" onclick="document.getElementById('searchResults').style.display='none'">إلغاء</button>
                            <button class="btn btn-sm btn-warning flex-1" onclick="forceAcceptBarcode('${decodedText.replace(/'/g, "\\'")}')">تخطي وتسجيل</button>
                        </div>
                    </div>
                `;
                return; 
            }

            this.processValidBarcode(decodedText);

        } catch (err) {
            UI.showToast('تعذرت قراءة الباركود، تأكد من وضوح الصورة.');
        }
    },

    processValidBarcode(decodedText) {
        sessionScannedBarcodes.add(decodedText);
        UI.showToast('تمت القراءة بنجاح!');
        
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('searchResults').innerHTML = `
            <div style="padding:20px; background:rgba(46,125,50,0.1); border:1px solid var(--success); border-radius:15px; text-align:center;">
                <div style="font-size:30px; margin-bottom:10px;">✅</div>
                <b class="success-text" style="font-size:16px;">تم تسجيل البيانات:</b><br>
                <div style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px; color:var(--text-main); word-break: break-all; font-family:monospace;">
                    ${decodedText}
                </div>
                <button class="btn btn-sm btn-outline" style="margin-top:15px; width:auto;" onclick="document.getElementById('searchResults').style.display='none'">إغلاق</button>
            </div>
        `;
    },

    forceAcceptBarcode(decodedText) {
        UI.showToast('تم تخطي الحماية وتأكيد التسجيل يدوياً ⚠️');
        this.processValidBarcode(decodedText);
    }
};

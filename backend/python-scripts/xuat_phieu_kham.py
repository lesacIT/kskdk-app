import sys
import json
import os
from datetime import datetime
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm, Cm
import qrcode
from io import BytesIO

# Nếu muốn xuất PDF, bỏ comment dòng dưới và cài docx2pdf: pip install docx2pdf
# from docx2pdf import convert

def xuất_phiếu(json_data, template_path, output_docx_path):
    """
    Nhận JSON từ Node.js, render template DOCX, chèn QR code, lưu file DOCX.
    Trả về đường dẫn file đã tạo (có thể chuyển thành PDF nếu cần).
    """
    # 1. Parse dữ liệu đầu vào
    data = json.loads(json_data)
    hoso = data.get('hoso', {})

    # 2. Xử lý ngày tháng (vì docxtpl không chạy strftime trực tiếp)
    if hoso.get('ngaysinh'):
        try:
            # Giả sử ngaysinh có dạng YYYY-MM-DD
            d = datetime.strptime(hoso['ngaysinh'], '%Y-%m-%d')
            hoso['ngaysinh_str'] = d.strftime('%d/%m/%Y')
        except:
            hoso['ngaysinh_str'] = hoso['ngaysinh']
    else:
        hoso['ngaysinh_str'] = ''

    if hoso.get('kl_ngayKL'):
        try:
            d = datetime.strptime(hoso['kl_ngayKL'], '%Y-%m-%d')
            hoso['kl_ngayKL_str'] = d.strftime('ngày %d tháng %m năm %Y')
        except:
            hoso['kl_ngayKL_str'] = hoso['kl_ngayKL']
    else:
        hoso['kl_ngayKL_str'] = 'ngày ...... tháng ...... năm ......'

    # 3. Tạo QR code từ makcb_barcode
    qr_data = hoso.get('makcb_barcode', '')
    qr_img = qrcode.make(qr_data)
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    # 4. Load template DOCX
    doc = DocxTemplate(template_path)

    # 5. Tạo context cho template (các placeholder)
    #    Ngoài hoso, còn có qr_code_image
    context = {
        'hoso': hoso,
        'qr_code_image': InlineImage(doc, qr_buffer, width=Cm(2.5))   # chèn QR ảnh
    }

    # Nếu bạn có ảnh chữ ký, thêm vào context tương tự:
    # if hoso.get('signature_path') and os.path.exists(hoso['signature_path']):
    #     context['signature_img'] = InlineImage(doc, hoso['signature_path'], width=Cm(3))

    # 6. Render (thay thế các placeholder)
    doc.render(context)

    # 7. Lưu file DOCX
    doc.save(output_docx_path)

    # 8. (Tuỳ chọn) Chuyển đổi sang PDF
    #    Bỏ comment nếu đã cài docx2pdf và muốn xuất PDF
    # output_pdf_path = output_docx_path.replace('.docx', '.pdf')
    # try:
    #     convert(output_docx_path, output_pdf_path)
    #     return output_pdf_path
    # except Exception as e:
    #     print(f"Lỗi convert PDF: {e}")
    #     return output_docx_path

    return output_docx_path


if __name__ == '__main__':
    # Nhận argument từ Node.js
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Thiếu dữ liệu đầu vào"}))
        sys.exit(1)

    json_input = sys.argv[1]

    # Đường dẫn template (cố định trong thư mục templates)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_file = os.path.join(base_dir, 'templates', 'MauKskdk.docx')

    # Tạo thư mục output nếu chưa có
    output_dir = os.path.join(base_dir, 'output')
    os.makedirs(output_dir, exist_ok=True)

    # Tên file đầu ra duy nhất (dùng timestamp)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = os.path.join(output_dir, f"phieu_{timestamp}.docx")

    try:
        # Gọi hàm xử lý
        result_path = xuất_phiếu(json_input, template_file, output_file)
        # Trả về JSON cho Node.js
        print(json.dumps({"success": True, "filePath": result_path}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
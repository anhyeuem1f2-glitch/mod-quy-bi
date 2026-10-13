# QBCC v0.6.0 – Gói sửa GitHub có xác minh nguồn

## Mã nguồn gốc đã kiểm chứng

- GitHub: `https://github.com/anhyeuem1f2-glitch/mod-quy-bi`
- Đường clone CỐ ĐỊNH: `https://github.com/anhyeuem1f2-glitch/mod-quy-bi.git`
- Nhánh: `main`
- Commit gốc đã kiểm tra qua GitHub API (ngày 13/10/2026): `661cf10182998a44c09bcf76aa26923f9be36732`
- Phiên bản gốc: `0.5.1`.
- Gói này KHÔNG mạo nhận là ZIP đầy đủ toàn bộ repository gốc. Nó chứa **bộ vá đã đối chiếu với source upstream v0.5.1** và một trình tự cập nhật tự động; khi chạy trên Windows, trình cập nhật tải **toàn bộ repo gốc** từ GitHub vào `%TEMP%`, xác nhận `origin`, nhánh và SHA trước khi động đến mã nguồn. Không cần người dùng tự ghép source.
- Nếu repo chính đã thay đổi so với SHA trên (hoặc đã được cập nhật), công cụ DỪNG AN TOÀN, không ghi đè vào bản mới không được kiểm tra.

## Dùng nhanh trên Windows

1. Giải nén tất cả nội dung của ZIP vào một thư mục bình thường.
2. Cài Git, Node.js và Python 3; đảm bảo cả ba chạy được trong CMD. Đảm bảo có Internet và quyền push vào tài khoản GitHub.
3. Chạy `VERIFY_AND_BUILD_ONLY.cmd` trước. Chương trình tự clone mã nguồn đúng GitHub vào thư mục tạm, xác minh commit, vá các file được chỉ định, chạy các test cũ + mới, build runtime; lưu kết quả tại `BUILD_OUTPUT/qbcc-runtime-v0.6.0.js`. **Không push.**
4. Nếu bước 3 thành công, chạy `BUILD_AND_PUSH_GITHUB.cmd`. Nó làm lại các bước trên từ đúng commit rồi `git commit` và `git push` bình thường **không force-push**.
5. Chỉ sau khi push thành công, import `LOTM_Bach_Khoa_QBCC_v0.6.0_NPC_Tu_Chu.json` vào SillyTavern; reload trang và kiểm tra 3 script Tavern Helper (MVU, Zod, QBCC import). Phần import dùng `https://cdn.jsdelivr.net/gh/anhyeuem1f2-glitch/mod-quy-bi@main/dist/qbcc-runtime-v0.6.0.js`.
6. Vào `Extensions > QBCC Runtime` để nhập URL/API Key/Model dùng cho kiểm toán ngữ nghĩa. Chọn **Khó** hoặc **Ác mộng** để bật `USER=NPC` ở tầng nghiêm ngặt.

### Nếu muốn dùng repo đã có trên máy

Có thể gọi từ CMD:

```bat
BUILD_AND_PUSH_GITHUB.cmd "C:\duong-dan\mod-quy-bi"
```

Công cụ sẽ **kiểm tra** URL `origin`, SHA, nhánh `main` và trạng thái sạch. Nó từ chối thư mục mã nguồn không đúng hoặc đang có chỉnh sửa chưa commit. Không tự clone thêm trong trường hợp này.

### Không tạo repo rác trên máy

Khi không truyền thư mục repo, công cụ clone vào một thư mục tạm do hệ điều hành quản lý (`%TEMP%\qbcc_verified_git_*`), tự giải phóng sau khi chạy. Nó KHÔNG clone vào thư mục chứa ZIP và KHÔNG thay đổi các repo khác trên máy. Kết quả bundle đã build được giữ ở `BUILD_OUTPUT` để kiểm tra.

## Thay đổi chính của v0.6.0

- Giữ nguyên tính năng Amon, Adam, Hắc Dạ và Rắn Vận Mệnh từ mã nguồn thật; chỉ vá các file được liệt kê trong `apply_update.py`.
- `src/core/npcAgency.js`: thiết lập NPC tự chủ, không chiều MC, niềm tin và thiện cảm tăng chậm, giới hạn tăng đột ngột.
- `src/integrations/finalRequestGate.js`: thêm chỉ thị NPC tự chủ tại điểm kiểm tra request cuối.
- `src/core/modelClient.js`: thêm tiêu chí phát hiện tăng thiện cảm, NPC lộ bí mật, Nữ thần quan tâm vô cớ, tự nhận quyền lên sương mù xám và người chơi tự vẽ kết quả.
- `src/index.js`: bổ sung snapshot quan hệ cho auditor, kiểm tra các JSONPatch tăng thiện cảm quá lớn.
- `src/config.js`: chuyển VERSION thành `0.6.0`, giữ lifecycle cho v0.5.1 để thay thế đúng lúc.
- `build_bundle.py`: giữ các bundle phiên bản cũ; tạo `dist/qbcc-runtime-v0.6.0.js` mới.
- Card: **794 entry**, gồm entry #880 về hành xử NPC; EJS/MVU/Zod/Tavern Helper giữ lại.

## Mức chắc chắn và hạn chế

**Đã xác minh:** URL repo, commit SHA và các đoạn code ở upstream v0.5.1 qua GitHub công khai; mã vá có anchor chính xác và từ chối chỉnh sửa khi không khớp; JSON, EJS và unit-test độc lập đã chạy được trong môi trường soạn gói.

**Chưa xác minh trực tiếp tại đây:** Không thể clone toàn bộ GitHub và chạy tất cả upstream test ngay trong môi trường soạn gói do kết nối GitHub từ môi trường thực thi bị chặn. Vì thế bước clone/build/test/push **được chủ động giao cho script trên máy người dùng**; chỉ báo thành công sau khi tất cả kiểm tra tại máy đó đạt.

**Giới hạn kỹ thuật:** `MC=NPC` và kiểm toán ngữ nghĩa của model không đảm bảo tuyệt đối không bịa. Phần giới hạn thiện cảm tất định hiện nhận diện các JSONPatch dạng đường dẫn được hỗ trợ; trường hợp cập nhật MVU bằng cơ chế khác cần kiểm tra thực tế. Cơ chế runtime chạy ở phía client không thể ngăn chủ sở hữu tự tắt script hoặc chỉnh file gốc. Chỉ thị `USER=NPC` nghiêm ngặt áp dụng Khó/Ác mộng; Dễ/Thường giữ lớp bảo vệ cơ bản như v0.5.1.

## Tình trạng gói cũ

`LOTM_QBCC_v0.6.0_NPC_Agency_GitHub_Update.zip` là gói patch 8 file. README cũ từng nói tự clone nhưng `BUILD_AND_PUSH_GITHUB.cmd` cũ lại đòi repo sẵn trên máy, nên không đủ chính xác. **Hãy dùng gói cập nhật này thay cho gói cũ.**

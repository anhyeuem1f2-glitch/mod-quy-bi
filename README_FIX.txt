QBCC v0.6.0 – SUA LOI 404 BUNDLE, KHONG CAN PYTHON

Xac nhan GitHub ngay 13/10/2026:
 - Repository: https://github.com/anhyeuem1f2-glitch/mod-quy-bi
 - GitHub da co src/core/npcAgency.js, nhung src/config.js van ghi 0.5.1.
 - /dist/qbcc-runtime-v0.6.0.js khong ton tai (404).
 - Vi vay card v0.6.0 khong tai duoc runtime moi.

CACH SUA (may Windows)
1. Giai nen ZIP nay vao THU MUC GOC repository local 'mod-quy-bi' (thu muc co .git, src, dist).
   Cho phep hop nhat thu muc src/core, tests. Khong can copy vao Github bang trinh duyet.
2. Chay FIX_BUILD_PUSH.cmd (hoac FIX_BUILD_ONLY.cmd neu chi muon test).
3. Script dung GIT + NODE, KHONG CAN PYTHON. Neu may chua co node: https://nodejs.org/
4. File se doi chieu origin la anhyeuem1f2-glitch/mod-quy-bi, doc src goc,
   kiem tra cac vi tri can sua, ap dung v0.6.0, chay test, build dist v0.6.0.
5. Khi va chi khi test + build thanh cong, script se git fetch, git commit, git push
   binh thuong (khong force). Phai co ket noi va quyen push.
6. Xem: https://github.com/anhyeuem1f2-glitch/mod-quy-bi/tree/main/dist
   Phai co qbcc-runtime-v0.6.0.js. Sau do tai lai SillyTavern.
7. Nhap card trong thu muc card/ neu chua nhap. Card da import v0.6.0.

Luu y:
 - Script su dung src hien tai tren MAY CUA BAN. Khong clone, khong overwrite ngoai repo.
 - Neu repo dang co thay doi chua commit, script dung truoc khi ghi de.
 - Neu GitHub da co commit moi, script chi push khi local HEAD trung remote.
 - Doi moi tinh nang NPC/thien cam/duoc truy cap o Khó/Ác mộng, giu Adam,
   Amon, Hac Da, Ran Van Menh va code goc.
 - Runtime dang chay tai trinh duyet chua duoc thu truc tiep trong SillyTavern.

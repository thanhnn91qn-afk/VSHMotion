# VSHMotion

Dựng video tuyên truyền cho **Bệnh viện Việt Nam – Thụy Điển Uông Bí** từ một file JSON
kịch bản. Lời đọc do máy chủ TTS tiếng Việt trong mạng nội bộ sinh ra; hình ảnh động
là HTML/CSS/SVG do Chrome vẽ rồi ffmpeg ghép lại. Không cần phần mềm dựng phim.

📖 **[HUONG-DAN-TAO-VIDEO.md](HUONG-DAN-TAO-VIDEO.md) — đọc file này trước.**

🤖 **Dùng với Claude Code:** repo có sẵn skill `.claude/skills/vshmotion/` — quy trình và các
quy tắc nội dung (ảnh chỉ của bệnh viện, che thông tin người bệnh, "test" chỉ dựng 1 clip…).
Mở Claude trong repo là skill tự có; muốn dùng ở thư mục khác thì `npm run skill:install`.

## Chạy nhanh

```bash
npm install

# xem thử bố cục, ~40 giây, không gọi TTS
node build-16x9.mjs --scenes=scenes-zona-yhct.json --name=zona --stills

# dựng đủ, ~3-6 phút
node build-16x9.mjs --scenes=scenes-zona-yhct.json --name=zona
```

Ra `out/video-zona.mp4` (có tiếng) và `out/video-zona-silent.mp4` (không tiếng).

Khổ dọc 1080×1920 dùng `build-styles.mjs` với cùng bộ tham số.

## Nội dung

| Đường dẫn | Là gì |
|---|---|
| `build-16x9.mjs` | Khổ ngang 1920×1080 — bộ máy hiệu ứng và 13 kiểu cảnh |
| `build-styles.mjs` | Khổ dọc 1080×1920 — bộ máy hiệu ứng và 13 kiểu cảnh |
| `pipeline.mjs` | Phần chung của hai khổ: lời đọc, chụp từng khung, nối, trộn tiếng |
| `director.mjs` | **Bộ đạo diễn**: tự chọn kiểu cảnh, hình vẽ, chuyển cảnh cho chỗ kịch bản để trống |
| `motion.mjs` | Biểu đồ, vòng số đếm (GSAP, chuyển thể từ HyperFrames), hiệu ứng chữ |
| `assemble.mjs` | Nối cảnh có chuyển cảnh, cắt lời đọc cho khớp, trộn nhạc nền có ducking |
| `art.mjs` | 38 hình vẽ nét SVG tự vẽ dần + 748 icon y tế nhập sẵn |
| `scene-check.mjs` | Kiểm tra kịch bản trước khi dựng |
| `wordsync.mjs` | Cho dòng chữ / cột biểu đồ hiện đúng lúc lời đọc nhắc tới |
| `tools/look.py` | Đo video đã dựng: đứng hình, khung trống, độ to (từ motionmaxxing) |
| `tools/make-music.py` | Sinh nhạc nền (Python + numpy), 4 tâm trạng, lặp liền mạch |
| `assets/sfx/` | 6 tiếng hiệu ứng (Pixabay) kèm bảng cân mức `sfx.json` |
| `scenes/` | Kịch bản từng clip (`--scenes=` tự tìm trong thư mục này) |
| `assets/photos/` | Ảnh dùng trong clip |
| `assets/logo.png` | Logo bệnh viện |

## Cần có trên máy

Node 18+ · Google Chrome · ffmpeg · một máy chủ TTS nhận `POST /tts {text}` và trả WAV.

Tuỳ chọn: Python 3 + numpy để tự sinh nhạc nền (thiếu thì clip vẫn dựng, chỉ không có nhạc).

Đường dẫn phụ thuộc máy đặt bằng biến môi trường, không phải sửa code: `CHROME_PATH`
(tự dò ở chỗ cài mặc định), `FFMPEG_BIN` (thư mục chứa ffmpeg nếu chưa có trong PATH),
`TTS_ENDPOINT` (mặc định `http://192.168.1.71:8000`), `PYTHON`.

```bash
npm test          # soát lại toàn bộ kịch bản và bảng từ khoá hình vẽ, ~1 giây
```

## Lưu ý khi làm nội dung y tế

- Ảnh chụp màn hình hệ thống thật phải che hết tên, số bệnh án, số thẻ BHYT của người bệnh.
- Không lặp một ảnh trong cùng một clip; ảnh phải đúng nội dung câu đang đọc.
- Trong trường `voice`, mọi chữ số phải viết thành chữ — máy đọc không đọc được số.

Chi tiết và danh sách lỗi đã gặp: xem [HUONG-DAN-TAO-VIDEO.md](HUONG-DAN-TAO-VIDEO.md).

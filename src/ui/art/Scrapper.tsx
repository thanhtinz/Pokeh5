/**
 * Người nhặt ve chai và đống sắt vụn — tấm hình đầu tiên của cả game.
 *
 * ## Vì sao phải có tấm này
 *
 * Bộ asset cũ vẽ trên sân 48×48, bốn tông phẳng, mỗi hình chừng sáu tới tám
 * mảnh. Ở cỡ đó thì thứ vẽ ra được chỉ có thể là **ký hiệu**: một viên kim
 * cương sáu mặt phẳng nói "đây là quặng" chứ không cho ai nhìn thấy quặng. Đó
 * đúng là chỗ mà cả game trông như một bảng biểu tượng.
 *
 * Tấm này đi hướng ngược lại, và ba thứ tạo nên khác biệt:
 *
 *  1. **Sân rộng gấp hai mươi lần diện tích.** 240×200 thay vì 48×48, nên có
 *     chỗ cho chi tiết: ngón tay, nếp áo, cái lốp xe móp, mấy vỏ lon.
 *  2. **Có khối, không phẳng.** Mỗi hình lớn có một dải chuyển màu, một mảng
 *     tối ở mặt khuất, và một vệt sáng mỏng ở rìa đón sáng. Ánh sáng đến từ
 *     trên-trái, và mọi bóng đổ đều đổ về cùng một phía.
 *  3. **Có người.** Đây là thứ thiếu hẳn từ đầu. Một đống sắt vụn là một món
 *     đồ; một người ngồi xổm đập vào đống sắt vụn là một hoàn cảnh, và game
 *     này kể chuyện một người đang nợ một tỷ.
 *
 * ## Vì sao nhân vật không đổi màu theo bảng màu chung
 *
 * Tấm này mang luôn `art p-rust`, tức là nó dùng đúng bộ bốn tông của hệ asset
 * cũ — `--art-1` … `--art-4` chỉ tồn tại bên trong `.art`, và quên khai thì mọi
 * hình ăn theo chúng ra màu rỗng, tức là đen. Sắt vụn thì lấy tông gỉ.
 *
 * Cả giao diện chạy theo một góc màu duy nhất, và mọi asset cũ đều nhuộm theo
 * nó. Với đồ vật thì đúng — cái sạp đổi từ đỏ nợ sang vàng giàu là một phần
 * của câu chuyện. Với **người** thì sai: da người nhuộm hồng rồi nhuộm vàng
 * trông như một cái biểu tượng đổi màu, không phải một người. Nên nhân vật giữ
 * màu riêng, còn nền và đống sắt thì vẫn ăn theo bảng màu chung. Người đứng
 * yên, thế giới quanh anh ta ấm dần lên.
 */

interface Props {
  /** Ref lên cánh tay cầm búa, để vòng lặp xoay nó mỗi khung hình. */
  armRef?: (element: SVGGElement | null) => void;
  bodyRef?: (element: SVGGElement | null) => void;
}

export function Scrapper({ armRef, bodyRef }: Props) {
  return (
    <svg class="scrap art p-rust" viewBox="0 0 240 200" aria-hidden="true">
      <defs>
        {/* Đống sắt: hai tông của bảng màu chung, sáng trên tối dưới. */}
        <linearGradient id="sc-heap" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stop-color="var(--art-2)" />
          <stop offset="1" stop-color="var(--art-3)" />
        </linearGradient>
        <linearGradient id="sc-heap-dark" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stop-color="var(--art-3)" />
          <stop offset="1" stop-color="var(--art-4)" />
        </linearGradient>

        {/* Người: màu riêng, không theo bảng màu chung. */}
        <linearGradient id="sc-skin" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#e8b088" />
          <stop offset="1" stop-color="#c98b63" />
        </linearGradient>
        <linearGradient id="sc-shirt" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stop-color="#5b86a8" />
          <stop offset="0.55" stop-color="#3f6484" />
          <stop offset="1" stop-color="#2c4a63" />
        </linearGradient>
        <linearGradient id="sc-pants" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#4a4f5e" />
          <stop offset="1" stop-color="#2f333e" />
        </linearGradient>
        <linearGradient id="sc-hat" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#d9c48a" />
          <stop offset="1" stop-color="#a68f57" />
        </linearGradient>
        <linearGradient id="sc-steel" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stop-color="#cfd6de" />
          <stop offset="0.5" stop-color="#96a1ad" />
          <stop offset="1" stop-color="#5d6874" />
        </linearGradient>

        {/* Quầng sáng sau lưng: chỗ duy nhất trong tấm này biết tới ánh sáng. */}
        <radialGradient id="sc-glow" cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stop-color="var(--art-2)" stop-opacity="0.34" />
          <stop offset="1" stop-color="var(--art-2)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="96" rx="104" ry="86" fill="url(#sc-glow)" />

      {/* ------------------------------------------------------------ nền -- */}

      {/* Mặt đất. Một vệt sẫm chứ không phải một đường kẻ: đường kẻ thì thành
          bản vẽ kỹ thuật, vệt sẫm thì thành nền đất. */}
      <ellipse cx="120" cy="171" rx="98" ry="15" fill="var(--art-4)" opacity="0.5" />
      <ellipse cx="120" cy="169" rx="86" ry="11" fill="var(--art-3)" opacity="0.35" />

      {/* ---------------------------------------------------- đống sắt vụn -- */}

      <g>
        {/* Bóng đổ của cả đống, lệch về phải vì sáng đến từ trên-trái. */}
        <ellipse cx="168" cy="164" rx="54" ry="10" fill="#000" opacity="0.32" />

        {/* Tấm tôn cong dựng phía sau. */}
        <path
          d="M126 158 C132 118 150 100 176 96 C170 116 168 138 172 158Z"
          fill="url(#sc-heap-dark)"
        />
        <path d="M126 158 C132 122 146 104 166 98 C150 118 140 136 138 158Z" fill="url(#sc-heap)" />

        {/* Ống nước chồng lên nhau. */}
        <g>
          <rect x="150" y="132" width="66" height="13" rx="6.5" fill="url(#sc-heap-dark)" />
          <ellipse cx="216" cy="138.5" rx="4" ry="6.5" fill="var(--art-2)" />
          <ellipse cx="216" cy="138.5" rx="2" ry="3.6" fill="var(--art-4)" />
          <rect x="150" y="132" width="66" height="4" rx="2" fill="#fff" opacity="0.14" />
        </g>
        <g>
          <rect x="140" y="146" width="76" height="13" rx="6.5" fill="url(#sc-heap)" />
          <ellipse cx="216" cy="152.5" rx="4" ry="6.5" fill="var(--art-1)" />
          <ellipse cx="216" cy="152.5" rx="2" ry="3.6" fill="var(--art-4)" />
          <rect x="140" y="146" width="76" height="4" rx="2" fill="#fff" opacity="0.16" />
        </g>

        {/* Lốp xe móp một bên. */}
        <ellipse cx="196" cy="122" rx="24" ry="21" fill="#26272c" />
        <ellipse cx="196" cy="122" rx="24" ry="21" fill="none" stroke="#3a3c43" stroke-width="3" />
        <ellipse cx="196" cy="122" rx="11" ry="9.5" fill="url(#sc-steel)" />
        <ellipse cx="196" cy="122" rx="5" ry="4.2" fill="#2f3138" />
        <path d="M176 112a24 21 0 0 1 14-11" stroke="#5a5c64" stroke-width="3" fill="none" />

        {/* Vỏ lon rơi vãi dưới chân đống. */}
        <g>
          <rect x="128" y="152" width="9" height="14" rx="3" fill="url(#sc-steel)" />
          <rect x="128" y="152" width="3" height="14" rx="1.5" fill="#fff" opacity="0.35" />
          <rect
            x="112"
            y="158"
            width="14"
            height="9"
            rx="3"
            fill="url(#sc-steel)"
            transform="rotate(-12 119 162)"
          />
          <rect x="208" y="158" width="9" height="12" rx="3" fill="url(#sc-steel)" />
        </g>
      </g>

      {/* --------------------------------------------------------- người ---- */}

      <g ref={bodyRef ? (element) => bodyRef(element as SVGGElement | null) : undefined}>
        {/* Bóng đổ dưới chân. */}
        <ellipse cx="86" cy="166" rx="34" ry="8" fill="#000" opacity="0.34" />

        {/* Chân sau, gập lại — ngồi xổm. */}
        <path d="M68 166 C64 150 70 138 82 134l10 8c-8 6-11 15-10 24Z" fill="#272a33" />

        {/* Chân trước. */}
        <path d="M78 166 C74 148 84 136 100 134l8 10c-10 3-16 12-16 22Z" fill="url(#sc-pants)" />
        {/* Nếp gấp ở đầu gối: một mảng tối, không phải một đường kẻ. */}
        <path d="M92 140 C99 136 104 135 108 136l-2 6c-5 0-10 2-14 5Z" fill="#000" opacity="0.18" />

        {/* Giày. */}
        <path d="M62 166 h30 a4 4 0 0 1 0 8 H62a4 4 0 0 1 0-8Z" fill="#1e2027" />
        <path d="M88 166 h26 a5 5 0 0 1 0 9 H88Z" fill="#2a2d36" />

        {/* Thân: hơi cúi về trước, vì đang đập. */}
        <path
          d="M76 138 C70 120 74 102 88 94 c14-8 30-4 36 8 6 12 4 26-6 34 -12 9-34 8-42 2Z"
          fill="url(#sc-shirt)"
        />
        {/* Mặt khuất sáng của thân. */}
        <path
          d="M104 96 c12 2 20 10 20 22 0 8-4 14-10 18 -6-14-8-28-10-40Z"
          fill="#000"
          opacity="0.2"
        />
        {/* Vệt sáng rìa vai, phía đón sáng. */}
        <path d="M86 96 c6-4 14-5 20-3l-3 5c-6-1-12 0-17 3Z" fill="#fff" opacity="0.22" />

        {/* Túi áo — chi tiết nhỏ, nhưng là thứ tách một cái áo khỏi một khối màu. */}
        <rect x="92" y="116" width="14" height="12" rx="2.5" fill="#000" opacity="0.22" />
        <rect x="92" y="116" width="14" height="3" rx="1.5" fill="#fff" opacity="0.14" />

        {/* Tay trái chống lên gối. */}
        <path d="M78 120 C68 126 64 134 66 142l9 2c0-6 3-11 9-14Z" fill="url(#sc-shirt)" />
        <circle cx="70" cy="145" r="7" fill="url(#sc-skin)" />

        {/* Đầu. */}
        <g>
          <path d="M96 76 c12-4 24 2 26 12 2 10-6 18-16 18 -10 0-18-6-18-15 0-7 3-12 8-15Z" fill="url(#sc-skin)" />
          {/* Cổ, nằm dưới cằm nên tối hơn. */}
          <path d="M100 100 h14 v8 c-6 3-12 3-16 0Z" fill="#b07a55" />
          {/* Mảng tối bên má khuất. */}
          <path d="M114 82 c8 2 10 10 8 16 -2 5-7 8-12 8 4-7 6-16 4-24Z" fill="#000" opacity="0.16" />
          {/* Mắt: hai chấm, và một cái nhíu mày — đang gồng. */}
          <ellipse cx="104" cy="90" rx="2.2" ry="2.8" fill="#2a2029" />
          <ellipse cx="116" cy="89" rx="2.2" ry="2.8" fill="#2a2029" />
          <path d="M100 84.5 l7 2" stroke="#2a2029" stroke-width="2.2" stroke-linecap="round" />
          <path d="M120 83.5 l-6 2" stroke="#2a2029" stroke-width="2.2" stroke-linecap="round" />
          {/* Miệng mím. */}
          <path d="M106 97 q5 3 9 0" stroke="#8c5540" stroke-width="2.2" fill="none" stroke-linecap="round" />

          {/* Mũ tai bèo. */}
          <path d="M88 78 c0-11 8-18 19-18 11 0 19 7 19 17 0 2-1 4-2 5H90Z" fill="url(#sc-hat)" />
          <path d="M82 80 h50 a5 5 0 0 1 0 7 H82a5 5 0 0 1 0-7Z" fill="url(#sc-hat)" />
          <path d="M82 80 h50 a5 5 0 0 1 2 3H80Z" fill="#fff" opacity="0.2" />
          <path d="M107 60 c11 0 19 7 19 17 0 2-1 4-2 5h-8c2-9 0-17-9-22Z" fill="#000" opacity="0.16" />
        </g>

        {/* Tay phải cầm búa. Cả nhóm xoay quanh khớp vai (126, 112). */}
        <g
          class="scrap__arm"
          ref={armRef ? (element) => armRef(element as SVGGElement | null) : undefined}
        >
          <path d="M116 104 c14-2 24 4 27 14l-9 5c-3-6-9-9-18-8Z" fill="url(#sc-shirt)" />
          <path d="M134 118 c6 8 8 16 7 24l-10-1c1-7 0-13-4-18Z" fill="url(#sc-shirt)" />
          <circle cx="134" cy="143" r="7.5" fill="url(#sc-skin)" />

          {/* Búa: cán gỗ, đầu thép có mặt sáng và mặt khuất. */}
          <rect
            x="131"
            y="106"
            width="6"
            height="44"
            rx="3"
            fill="#8a6034"
            transform="rotate(14 134 128)"
          />
          <rect
            x="131"
            y="106"
            width="2.4"
            height="44"
            rx="1.2"
            fill="#fff"
            opacity="0.22"
            transform="rotate(14 134 128)"
          />
          <g transform="rotate(14 134 128)">
            <rect x="120" y="96" width="28" height="15" rx="3.5" fill="url(#sc-steel)" />
            <rect x="120" y="96" width="28" height="4.5" rx="2" fill="#fff" opacity="0.4" />
            <rect x="120" y="106" width="28" height="5" rx="2" fill="#000" opacity="0.28" />
            <rect x="144" y="96" width="5" height="15" rx="2" fill="#4d5661" />
          </g>
        </g>
      </g>
    </svg>
  );
}

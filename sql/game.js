/* 
Xin chao ban toi PokeMon Viet Nam ! Tro choi duoc Build Xay dung boi DucNghia ( fb.com/ducnghiaq)
cac ma nguon chinh cua tro choi : PHP 8,Mysql,html5,javascript (realtime dung Server-Sent Events)
Cac game duoc tich hop duoc share tren mang xa hoi !
////ENGLISH 

Welcome to PokeMOn Vietnam. The game was founded by DucNghia with the source code shared on social networks!
The game works on servers: php 8.3+, mysql, html5 etc. Realtime uses Server-Sent Events, so no separate socket server is needed.
When participating in Vietnam pokemon, you must accept the following terms:
1, User account must be responsible for the use license! accounts must not be vulgar, disrespectful regarding organizations ...

2, Participating users must approve the actions they cause if they damage the pokemon server! You may be banned from playing or permanently deleted.

3, PokeMon Vietnam is not founded by any organization or business that stands out and develops.
PokeMon Vietnam is just a small game for Vietnamese people! License of the problem completely belongs to PokeMon company.

*/

  $(document).ready( function () {
    opengame();
});

/**
 * The interface is laid out for a 490px-wide phone screen: the map canvas,
 * the HUD and every absolutely positioned panel in data.php are sized against
 * it. Re-flowing all of that is not something a stylesheet can do, so the
 * frame keeps its 490px design width and is scaled to fill the window
 * instead - which is what makes it read as full screen rather than a small
 * column sitting in the middle of a wallpaper.
 */
var DUCNGHIA_DESIGN_WIDTH = 490;

/**
 * The vertical layout is elastic, but it still needs room: the HUD, the map
 * and the chat panel stack down the screen, and the main menu's buttons sit
 * near the bottom. Scaling on width alone shrinks the usable design height
 * until those buttons fall off the screen, so the frame is fitted as a
 * portrait screen of this height and centred.
 */
var DUCNGHIA_DESIGN_HEIGHT = 850;

var DUCNGHIA_MAX_SCALE = 3;

function opengame(){
    var host = document.getElementsByTagName('ducnghia')[0];
    if (!host) {
        return;
    }

    host.innerHTML = '<iframe id="ducnghia_frame" src="/game.json" scrolling="no" marginwidth="0" marginheight="0" frameborder="0" vspace="0" hspace="0"></iframe>';

    sizegame();
}

function sizegame(){
    var frame = document.getElementById('ducnghia_frame');
    if (!frame) {
        return;
    }

    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;

    var scale = Math.min(
        vw / DUCNGHIA_DESIGN_WIDTH,
        vh / DUCNGHIA_DESIGN_HEIGHT,
        DUCNGHIA_MAX_SCALE
    );

    // Never render smaller than the original fixed 490px layout. On a short
    // desktop window - 1280x800, say - fitting on height alone works out to
    // 0.94 and would shrink the game below the size it used to be, which is a
    // regression, not a full-screen view. Below 1x the frame keeps its design
    // size and the window simply shows less of it, exactly as before.
    if (scale < 1) {
        scale = 1;
    }

    // The frame is laid out at the design width and then scaled, so the page
    // inside it still believes it is 490px wide and every fixed offset lands
    // where it was drawn. Height is divided by the scale so the scaled result
    // is exactly the window height - no letterboxing, no inner scrollbar.
    frame.style.width = DUCNGHIA_DESIGN_WIDTH + 'px';
    frame.style.height = Math.ceil(vh / scale) + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    frame.style.transformOrigin = 'top left';
    frame.style.position = 'absolute';
    frame.style.top = '0';
    frame.style.left = Math.max(0, (vw - DUCNGHIA_DESIGN_WIDTH * scale) / 2) + 'px';
}

window.addEventListener('resize', sizegame);
window.addEventListener('orientationchange', sizegame);
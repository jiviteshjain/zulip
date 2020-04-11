const util = require("./util");
const autosize = require('autosize');

let narrow_window = false;

function calc_vh() {
    const vh = window.innerHeight * 0.01;
    this.document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', function () {
    calc_vh();
});
window.addEventListener('load', function () {
    calc_vh();
});

function confine_to_range(lo, val, hi) {
    if (val < lo) {
        return lo;
    }
    if (val > hi) {
        return hi;
    }
    return val;
}

function size_blocks(blocks, usable_height) {
    let sum_height = 0;

    for (const block of blocks) {
        sum_height += block.real_height;
    }

    for (const block of blocks) {
        let ratio = block.real_height / sum_height;
        ratio = confine_to_range(0.05, ratio, 0.85);
        block.max_height = confine_to_range(80, usable_height * ratio, 1.2 * block.real_height);
    }
}

function set_user_list_heights(res, usable_height, buddy_list_wrapper, group_pms) {
    // Calculate these heights:
    //    res.buddy_list_wrapper_max_height
    //    res.group_pms_max_height
    const blocks = [
        {
            real_height: ui.get_scroll_element(buddy_list_wrapper).prop('scrollHeight'),
        },
        {
            real_height: ui.get_scroll_element(group_pms).prop('scrollHeight'),
        },
    ];

    size_blocks(blocks, usable_height);

    res.buddy_list_wrapper_max_height = blocks[0].max_height;
    res.group_pms_max_height = blocks[1].max_height;
}

function get_new_heights() {
    const res = {};
    const viewport_height = message_viewport.height();
    const top_navbar_height = $("#top_navbar").safeOuterHeight(true);
    const invite_user_link_height = $("#invite-user-link").safeOuterHeight(true) || 0;

    res.bottom_whitespace_height = viewport_height * 0.4;

    res.main_div_min_height = viewport_height - top_navbar_height;

    res.stream_filters_max_height = viewport_height
        - parseInt($("#left-sidebar").css("marginTop"), 10)
        - parseInt($(".narrows_panel").css("marginTop"), 10)
        - parseInt($(".narrows_panel").css("marginBottom"), 10)
        - $("#global_filters").safeOuterHeight(true)
        - $("#streams_header").safeOuterHeight(true);

    // Don't let us crush the stream sidebar completely out of view
    res.stream_filters_max_height = Math.max(80, res.stream_filters_max_height);

    // RIGHT SIDEBAR
    const buddy_list_wrapper = $('#buddy_list_wrapper').expectOne();
    const group_pms = $('#group-pms').expectOne();

    const usable_height = viewport_height
        - parseInt($("#right-sidebar").css("marginTop"), 10)
        - parseInt(buddy_list_wrapper.css("marginTop"), 10)
        - parseInt(buddy_list_wrapper.css("marginBottom"), 10)
        - $("#userlist-header").safeOuterHeight(true)
        - $("#user_search_section").safeOuterHeight(true)
        - invite_user_link_height
        - parseInt(group_pms.css("marginTop"), 10)
        - parseInt(group_pms.css("marginBottom"), 10)
        - $("#group-pm-header").safeOuterHeight(true)
        - $("#sidebar-keyboard-shortcuts").safeOuterHeight(true);

    // set these
    // res.buddy_list_wrapper_max_height
    // res.group_pms_max_height
    set_user_list_heights(
        res,
        usable_height,
        buddy_list_wrapper,
        group_pms
    );

    return res;
}

function left_userlist_get_new_heights() {

    const res = {};
    const viewport_height = message_viewport.height();
    const viewport_width = message_viewport.width();
    res.viewport_height = viewport_height;
    res.viewport_width = viewport_width;

    // main div
    const top_navbar_height = $(".header").safeOuterHeight(true);
    res.bottom_whitespace_height = viewport_height * 0.4;
    res.main_div_min_height = viewport_height - top_navbar_height;


    // left sidebar
    const stream_filters = $('#stream_filters').expectOne();
    const buddy_list_wrapper = $('#buddy_list_wrapper').expectOne();

    const stream_filters_real_height = stream_filters.prop("scrollHeight");
    const user_list_real_height = ui.get_scroll_element(buddy_list_wrapper).prop("scrollHeight");

    res.total_leftlist_height = viewport_height
                                - parseInt($("#left-sidebar").css("marginTop"), 10)
                                - parseInt($(".narrows_panel").css("marginTop"), 10)
                                - parseInt($(".narrows_panel").css("marginBottom"), 10)
                                - $("#global_filters").safeOuterHeight(true)
                                - $("#streams_header").safeOuterHeight(true)
                                - $("#userlist-header").safeOuterHeight(true)
                                - $("#user_search_section").safeOuterHeight(true)
                                - parseInt(stream_filters.css("marginBottom"), 10)
                                - parseInt(buddy_list_wrapper.css("marginTop"), 10)
                                - parseInt(buddy_list_wrapper.css("marginBottom"), 10);

    const blocks = [
        {
            real_height: stream_filters_real_height,
        },
        {
            real_height: user_list_real_height,
        },
    ];

    size_blocks(blocks, res.total_leftlist_height);

    res.stream_filters_max_height = blocks[0].max_height;
    res.buddy_list_wrapper_max_height = blocks[1].max_height;
    res.group_pms_max_height = 0;

    return res;
}

exports.watch_manual_resize = function (element) {
    return (function on_box_resize(cb) {
        const box = document.querySelector(element);

        if (!box) {
            blueslip.error('Bad selector in watch_manual_resize: ' + element);
            return;
        }

        const meta = {
            box: box,
            height: null,
            mousedown: false,
        };

        const box_handler = function () {
            meta.mousedown = true;
            meta.height = meta.box.clientHeight;
        };
        meta.box.addEventListener("mousedown", box_handler);

        // If the user resizes the textarea manually, we use the
        // callback to stop autosize from adjusting the height.
        const body_handler = function () {
            if (meta.mousedown === true) {
                meta.mousedown = false;
                if (meta.height !== meta.box.clientHeight) {
                    meta.height = meta.box.clientHeight;
                    cb.call(meta.box, meta.height);
                }
            }
        };
        document.body.addEventListener("mouseup", body_handler);

        return [box_handler, body_handler];
    }(function (height) {
        // This callback disables autosize on the textarea.  It
        // will be re-enabled when this component is next opened.
        autosize.destroy($(element))
            .height(height + "px");
    }));
};

exports.resize_bottom_whitespace = function (h) {
    if (h !== undefined) {
        $("#bottom_whitespace").height(h.bottom_whitespace_height);
    }
};

exports.resize_stream_filters_container = function (h) {
    h = narrow_window ? left_userlist_get_new_heights() : get_new_heights();
    exports.resize_bottom_whitespace(h);
    $("#stream-filters-container").css('max-height', h.stream_filters_max_height);
};

exports.resize_page_components = function () {
    let sidebar;

    if (page_params.left_side_userlist) {
        const css_narrow_mode = message_viewport.is_narrow();

        $("#top_navbar").removeClass("rightside-userlist");

        const right_items = $('.right-sidebar-items').expectOne();

        if (css_narrow_mode && !narrow_window) {
            // move stuff to the left sidebar (skinny mode)
            narrow_window = true;
            popovers.set_userlist_placement("left");
            sidebar = $("#left-sidebar").expectOne();
            sidebar.append(right_items);
            $("#buddy_list_wrapper").css("margin", "0px");
            $("#userlist-toggle").css("display", "none");
            $("#invite-user-link").hide();
        } else if (!css_narrow_mode && narrow_window) {
            // move stuff to the right sidebar (wide mode)
            narrow_window = false;
            popovers.set_userlist_placement("right");
            sidebar = $("#right-sidebar").expectOne();
            sidebar.append(right_items);
            $("#buddy_list_wrapper").css("margin", '');
            $("#userlist-toggle").css("display", '');
            $("#invite-user-link").show();
        }
    }

    const h = narrow_window ? left_userlist_get_new_heights() : get_new_heights();

    exports.resize_bottom_whitespace(h);
    $("#buddy_list_wrapper").css('max-height', h.buddy_list_wrapper_max_height);
    $("#group-pms").css('max-height', h.group_pms_max_height);

    $("#stream-filters-container").css('max-height', h.stream_filters_max_height);

    panels.resize_app();
};

let _old_width = $(window).width();

exports.handler = function () {
    const new_width = $(window).width();

    if (new_width !== _old_width) {
        _old_width = new_width;
        condense.clear_message_content_height_cache();
    }

    // On mobile web, we want to avoid hiding a popover here,
    // especially if this resize was triggered by a virtual keyboard
    // popping up when the user opened that very popover.
    const mobile = util.is_mobile();
    if (!mobile) {
        popovers.hide_all();
    }
    exports.resize_page_components();

    // Re-compute and display/remove [More] links to messages
    condense.condense_and_collapse($(".message_table .message_row"));

    // This function might run onReady (if we're in a narrow window),
    // but before we've loaded in the messages; in that case, don't
    // try to scroll to one.
    if (current_msg_list.selected_id() !== -1) {
        if (mobile) {
            popovers.set_suppress_scroll_hide();
        }

        navigate.scroll_to_selected();
    }
};

window.resize = exports;

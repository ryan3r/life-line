/**
 * A widget that creates a link that hooks into the navigator
 */

lifeLine.makeDom.register("link", {
	make(opts) {
		return {
			tag: "a",
			attrs: {
				href: opts.href
			},
			on: {
				click: e => {
					// don't navigate the page
					e.preventDefault();

					lifeLine.nav.navigate(opts.href)
				}
			},
			text: opts.text
		};
	}
});

define(
	[
		'flight/lib/component'
	],

	function(defineComponent) {
		function navigationMenu() {
			this.defaultAttrs({
				menuItemSelector: '.menu-item',
				selectedClass: 'selected'
			});

			// mark menu item as selected.
			// mark others as not selected.
			// trigger uiLoadUrl event
			this.selectMenuItem = function(e) {
				this.select('menuItemSelector').toggleClass(this.attr.selectedClass);

				this.trigger('uiLoadUrl', {
					url: $(e.target).attr('href')
				});
			};

			this.after('initialize', function() {
				// 'menuItemSelector' is defined in defaultAttr
				this.on('click', {
					menuItemSelector: this.selectMenuItem
				});
			});
		}

		return defineComponent(navigationMenu);
	}
);
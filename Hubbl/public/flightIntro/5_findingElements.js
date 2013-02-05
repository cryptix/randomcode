// menu
define(
  [
    'flight/lib/component'
  ],

  function(defineComponent) {

    return defineComponent(menu);

    function menu() {
	this.defaultAttrs({
		menuItemSelector: '.menu-item',
		selectedClass: 'selected'
	});

	this.selectMenuItem = function(e) {
		// toggle 'selected' class on all list items
		this.select('menuItemSelector').toggleClass(this.attr.selectedClass);
		//...
	};

	}
});

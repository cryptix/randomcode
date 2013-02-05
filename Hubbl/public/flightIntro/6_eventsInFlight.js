// triggering
// ==========
this.saveButtonClicked = function() {
  this.trigger('saveRequested', currentDocument);
}

this.updateSuccessful = function() {
  this.trigger(document, 'transactionComplete', successData);
}

// subscribing to events
// =====================
this.after('initialize', function() {
  this.on(document, 'dataSent', this.refreshList);
  this.on('click', this.selectItem); // binds callback to this automatically
});

//event delegation. selectors from attr-object
this.after('initialize', function() {
  this.on('click', { // map event targets to callbacks
    menuItemSelector: this.selectMenuItem,
    saveButtonSelector: this.saveAll
  });
});
// selectors
this.defaultAttrs({
  menuItemSelector: '.menuItem',
  saveButtonSelector: '#save'
});


// unsubscribing
// =============
function disableAllDropdowns() {
  this.off('#select', 'click');
}

function noHighlightOnHover() {
  this.off('hover', this.highlight);
}
/**
 * Kanso document types to export
 */
var Type = require('kanso/types').Type,
    fields = require('kanso/fields'),
    widgets = require('kanso/widgets'),
    permissions = require('kanso/permissions');
 
exports.comment = new Type('comment', {
    permissions: {
        add: permissions.loggedIn(),
        update: permissions.usernameMatchesField('creator'),
        remove: permissions.usernameMatchesField('creator')
    },
    fields: {
        creator: fields.creator(),
        text: fields.string({
            widget: widgets.textarea({cols: 40, rows: 10})
        })
    }
});
  
exports.blogpost = new Type('blogpost', {
    permissions: {
      add:      permissions.hasRole('_admin'), 
      update:   permissions.hasRole('_admin'), 
      remove:   permissions.hasRole('_admin')
    },
    fields: {
        created: fields.timestamp(),
        title: fields.string(),
        text: fields.string({
            widget: widgets.textarea({cols: 40, rows: 10})
        }),
        comments: fields.embedList({
            type: exports.comment
        })
    }
});

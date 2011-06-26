var models = require('../public/models.js');
var sinon = require('sinon');

describe('Todo mode', function() {
  
  describe('when instantiated', function() {
    beforeEach(function() {
      this.todo = new models.Todo({
        title: 'Rake leaves'
      });
    });

    it('should exhibit attributes', function() {
      expect(this.todo.get('title')).toEqual('Rake leaves');
    });

    it('should set the priority to default', function() {
      expect(this.todo.get('priority')).toEqual(3);
    });

    describe('url', function() {
      beforeEach(function() {
        var collection = { url: '/collection' };

        this.todo.collection = collection;
      });

      describe('when no id is set', function() {
        it('should return the collection URL', function() {
          expect(this.todo.url()).toEqual('/collection');
        });
      });

      describe('when id is set', function() {
        it('should return the collection URL and id', function() {
          this.todo.id = 1;
          expect(this.todo.url()).toEqual('/collection/1');
        });
      });

      // validate
      it('should not save when title is empty', function() {
        var eventSpy = sinon.spy();

        this.todo.bind('error', eventSpy);
        this.todo.save({'title': ''});

        expect(eventSpy.calledOnce).toBeTruthy();
        expect(eventSpy.calledWith(this.todo, 'cannot have an empty title')).toBeTruthy();
      });
    });
  });
});

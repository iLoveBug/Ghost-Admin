import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {get} from '@ember/object';
import {inject as service} from '@ember/service';

const TYPES = [{
    name: '所有文章',
    value: null
}, {
    name: '草稿',
    value: 'draft'
}, {
    name: '已发布',
    value: 'published'
}, {
    name: '计划发布',
    value: 'scheduled'
}, {
    name: '标星',
    value: 'featured'
}];

const ORDERS = [{
    name: '最新',
    value: null
}, {
    name: '最久',
    value: 'published_at asc'
}, {
    name: '最近更新',
    value: 'updated_at desc'
}];

export default Controller.extend({

    session: service(),
    store: service(),

    queryParams: ['type', 'author', 'tag', 'order'],

    type: null,
    author: null,
    tag: null,
    order: null,

    _hasLoadedTags: false,
    _hasLoadedAuthors: false,

    availableTypes: null,
    availableOrders: null,

    init() {
        this._super(...arguments);
        this.availableTypes = TYPES;
        this.availableOrders = ORDERS;
    },

    postsInfinityModel: alias('model'),

    showingAll: computed('type', 'author', 'tag', function () {
        let {type, author, tag} = this.getProperties(['type', 'author', 'tag']);

        return !type && !author && !tag;
    }),

    selectedType: computed('type', function () {
        let types = this.get('availableTypes');
        return types.findBy('value', this.get('type'));
    }),

    selectedOrder: computed('order', function () {
        let orders = this.get('availableOrders');
        return orders.findBy('value', this.get('order'));
    }),

    _availableTags: computed(function () {
        return this.get('store').peekAll('tag');
    }),

    availableTags: computed('_availableTags.[]', function () {
        let tags = this.get('_availableTags')
            .filter(tag => tag.get('id') !== null)
            .sort((tagA, tagB) => tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true}));
        let options = tags.toArray();

        options.unshiftObject({name: '所有标签', slug: null});

        return options;
    }),

    selectedTag: computed('tag', '_availableTags.[]', function () {
        let tag = this.get('tag');
        let tags = this.get('availableTags');

        return tags.findBy('slug', tag);
    }),

    _availableAuthors: computed(function () {
        return this.get('store').peekAll('user');
    }),

    availableAuthors: computed('_availableAuthors.[]', function () {
        let authors = this.get('_availableAuthors');
        let options = authors.toArray();

        options.unshiftObject({name: '所有作者', slug: null});

        return options;
    }),

    selectedAuthor: computed('author', 'availableAuthors.[]', function () {
        let author = this.get('author');
        let authors = this.get('availableAuthors');

        return authors.findBy('slug', author);
    }),

    typeClassNames: computed('type', function () {
        let classNames = 'gh-contentfilter-menu gh-contentfilter-type';
        if (this.get('type')) {
            classNames = classNames + ' gh-contentfilter-selected';
        }
        return classNames;
    }),

    authorClassNames: computed('author', function () {
        let classNames = 'gh-contentfilter-menu gh-contentfilter-author';        
        if (this.get('author')) {
            classNames = classNames + ' gh-contentfilter-selected';
        }
        return classNames;
    }),

    tagClassNames: computed('tag', function () {
        let classNames = 'gh-contentfilter-menu gh-contentfilter-tag';
        if (this.get('tag')) {
            classNames = classNames + ' gh-contentfilter-selected';
        }
        return classNames;
    }),

    actions: {
        changeType(type) {
            this.set('type', get(type, 'value'));
        },

        changeAuthor(author) {
            this.set('author', get(author, 'slug'));
        },

        changeTag(tag) {
            this.set('tag', get(tag, 'slug'));
        },

        changeOrder(order) {
            this.set('order', get(order, 'value'));
        },

        openEditor(post) {
            this.transitionToRoute('editor.edit', 'post', post.get('id'));
        }
    }
});

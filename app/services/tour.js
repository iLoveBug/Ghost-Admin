import Evented from '@ember/object/evented';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import {computed} from '@ember/object';

export default Service.extend(Evented, {

    ghostPaths: service(),
    session: service(),

    // this service is responsible for managing tour item visibility and syncing
    // the viewed state with the server
    //
    // tour items need to be centrally defined here so that we have a single
    // source of truth for marking all tour items as viewed
    //
    // a {{gh-tour-item "unique-id"}} component can be inserted in any template,
    // this will use the tour service to grab content and determine visibility
    // with the component in control of rendering the throbber/controlling the
    // modal - this allows the component lifecycle hooks to perform automatic
    // display/cleanup when the relevant UI is visible.

    viewed: null,

    // IDs should **NOT** be changed if they have been part of a release unless
    // the re-display of the throbber should be forced. In that case it may be
    // useful to add a version number eg. `my-feature` -> `my-feature-v2`.
    // Format is as follows:
    //
    // {
    //     id: 'test',
    //     title: 'This is a test',
    //     message: 'This is a test of our <strong>feature tour</strong> feature'
    // }
    //
    // TODO: it may be better to keep this configuration elsewhere to keep the
    // service clean. Eventually we'll want apps to be able to register their
    // own throbbers and tour content
    throbbers: null,

    init() {
        this._super(...arguments);
        let adminUrl = `${window.location.origin}${this.get('ghostPaths.url').admin()}`;
        let adminDisplayUrl = adminUrl.replace(`${window.location.protocol}//`, '');

        this.viewed = [];

        this.throbbers = [{
            id: 'getting-started',
            title: '开始使用',
            message: `欢迎来到Ghost控制台！在此可以浏览你的网站，管理你的内容，编辑你的设置。<br><br>从 <a href="${adminUrl}" target="_blank">${adminDisplayUrl}</a> 这里可以登录控制台。`
        }, {
            id: 'using-the-editor',
            title: '使用Ghost编辑器',
            message: 'Ghost使用Markdown格式来写作，能够很容易并快速的格式化文章内容。此工具条会大有助益！点击 <strong>？</strong> 图标获得更多快捷方式。'
        }, {
            id: 'featured-post',
            title: '设置星标文章',
            message: '取决与你的主题，星标文章具有特定的样式，来展示特别重要和需要强调的故事。'
        }, {
            id: 'upload-a-theme',
            title: '定制你的网站',
            message: '采用定制的主题，你可以完全控制网站的外观来适配你的品牌。这里是一份完整的定制指南：<strong><a href="https://ghost.org/docs/api/handlebars-themes/" target="_blank">https://ghost.org/docs/api/handlebars-themes/</a></strong>'
        }];
    },

    _activeThrobbers: computed('viewed.[]', 'throbbers.[]', function () {
        // return throbbers that haven't been viewed
        let viewed = this.viewed;
        let throbbers = this.throbbers;

        return throbbers.reject(throbber => viewed.includes(throbber.id));
    }),

    // retrieve the IDs of the viewed throbbers from the server, always returns
    // a promise
    fetchViewed() {
        return this.get('session.user').then((user) => {
            let viewed = user.get('tour') || [];

            this.set('viewed', viewed);

            return viewed;
        });
    },

    // save the list of viewed throbbers to the server overwriting the
    // entire list
    syncViewed() {
        let viewed = this.viewed;

        return this.get('session.user').then((user) => {
            user.set('tour', viewed);

            return user.save();
        });
    },

    // returns throbber content for a given ID only if that throbber hasn't been
    // viewed. Used by the {{gh-tour-item}} component to determine visibility
    activeThrobber(id) {
        let activeThrobbers = this._activeThrobbers;
        return activeThrobbers.findBy('id', id);
    },

    // when a throbber is opened the component will call this method to mark
    // it as viewed and sync with the server. Always returns a promise
    markThrobberAsViewed(id) {
        let viewed = this.viewed;

        if (!viewed.includes(id)) {
            viewed.pushObject(id);
            this.trigger('viewed', id);
            return this.syncViewed();
        } else {
            return RSVP.resolve(true);
        }
    },

    // opting-out will use the list of IDs defined in this file making it the
    // single-source-of-truth and allowing future client updates to control when
    // new UI should be surfaced through tour items
    optOut() {
        let allThrobberIds = this.throbbers.mapBy('id');

        this.set('viewed', allThrobberIds);
        this.trigger('optOut');

        return this.syncViewed();
    },

    // this is not used anywhere at the moment but it's useful to use via ember
    // inspector as a reset mechanism
    reEnable() {
        this.set('viewed', []);
        return this.syncViewed();
    }

});

import $ from 'jquery';
import Controller, {inject as controller} from '@ember/controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {alias} from '@ember/object/computed';
import {isArray as isEmberArray} from '@ember/array';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend(ValidationEngine, {
    application: controller(),
    ajax: service(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    submitting: false,
    loggingIn: false,
    authProperties: null,

    flowErrors: '',
    // ValidationEngine settings
    validationType: 'signin',

    init() {
        this._super(...arguments);
        this.authProperties = ['identification', 'password'];
    },

    signin: alias('model'),

    actions: {
        authenticate() {
            return this.validateAndAuthenticate.perform();
        }
    },

    authenticate: task(function* (authStrategy, authentication) {
        try {
            return yield this.session
                .authenticate(authStrategy, ...authentication)
                .then(() => true); // ensure task button transitions to "success" state
        } catch (error) {
            if (isVersionMismatchError(error)) {
                return this.notifications.showAPIError(error);
            }

            if (error && error.payload && error.payload.errors) {
                let [mainError] = error.payload.errors;

                mainError.message = (mainError.message || '').htmlSafe();
                mainError.context = (mainError.context || '').htmlSafe();

                this.set('flowErrors', (mainError.context.string || mainError.message.string));

                if (mainError.context.string.match(/user with that email/i)) {
                    this.get('signin.errors').add('identification', '');
                }

                if (mainError.context.string.match(/password is incorrect/i)) {
                    this.get('signin.errors').add('password', '');
                }
            } else {
                console.error(error); // eslint-disable-line no-console
                // Connection errors don't return proper status message, only req.body
                this.notifications.showAlert(
                    'There was a problem on the server.',
                    {type: 'error', key: 'session.authenticate.failed'}
                );
            }
        }
    }).drop(),

    validateAndAuthenticate: task(function* () {
        let signin = this.signin;
        let authStrategy = 'authenticator:cookie';

        this.set('flowErrors', '');
        // Manually trigger events for input fields, ensuring legacy compatibility with
        // browsers and password managers that don't send proper events on autofill
        $('#login').find('input').trigger('change');

        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'signin'
        this.hasValidated.addObjects(this.authProperties);

        try {
            yield this.validate({property: 'signin'});
            return yield this.authenticate
                .perform(authStrategy, [signin.get('identification'), signin.get('password')])
                .then(() => true);
        } catch (error) {
            this.set('flowErrors', '请填充表单登录');
        }
    }).drop(),

    forgotten: task(function* () {
        let email = this.get('signin.identification');
        let forgottenUrl = this.get('ghostPaths.url').api('authentication', 'passwordreset');
        let notifications = this.notifications;

        this.set('flowErrors', '');
        // This is a bit dirty, but there's no other way to ensure the properties are set as well as 'forgotPassword'
        this.hasValidated.addObject('identification');

        try {
            yield this.validate({property: 'forgotPassword'});
            yield this.ajax.post(forgottenUrl, {data: {passwordreset: [{email}]}});
            notifications.showAlert(
                '请检查你的邮件进行下一步操作',
                {type: 'info', key: 'forgot-password.send.success'}
            );
            return true;
        } catch (error) {
            // ValidationEngine throws "undefined" for failed validation
            if (!error) {
                return this.set('flowErrors', '我们需要你的电子邮箱账号来重置密码！');
            }

            if (isVersionMismatchError(error)) {
                return notifications.showAPIError(error);
            }

            if (error && error.payload && error.payload.errors && isEmberArray(error.payload.errors)) {
                let [{message}] = error.payload.errors;

                this.set('flowErrors', message);

                if (message.match(/no user|not found/)) {
                    this.get('signin.errors').add('identification', '');
                }
            } else {
                notifications.showAPIError(error, {defaultErrorText: '密码重置出现问题，请再试一次！', key: 'forgot-password.send'});
            }
        }
    })
});

import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['email'],

    email(model) {
        let email = model.get('email');

        if (isBlank(email)) {
            model.get('errors').add('email', '请输入邮件地址');
            model.get('hasValidated').pushObject('email');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', '无效邮件地址');
            model.get('hasValidated').pushObject('email');
            this.invalidate();
        } else if (!validator.isLength(email, 0, 191)) {
            model.get('errors').add('email', '邮件地址太长');
            model.get('hasValidated').pushObject('email');
            this.invalidate();
        }
    }
});

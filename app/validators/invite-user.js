import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['email', 'role'],

    email(model) {
        let email = model.get('email');

        if (isBlank(email)) {
            model.get('errors').add('email', '请输入邮件地址');
            this.invalidate();
        } else if (!validator.isEmail(email)) {
            model.get('errors').add('email', '无效邮件地址');
            this.invalidate();
        }
    },

    role(model) {
        let role = model.get('role');

        if (isBlank(role)) {
            model.get('errors').add('role', '请选择一个角色');
            model.get('hasValidated').pushObject('role');
            this.invalidate();
        }
    }
});

const Validator = {

    required(value, name) {
        if (!value || value.toString().trim() === '') {
            throw new Error(name + " مطلوب");
        }
    },

    number(value, name) {
        if (isNaN(value)) {
            throw new Error(name + " يجب أن يكون رقم");
        }
    },

    min(value, min, name) {
        if (value < min) {
            throw new Error(name + " لا يمكن أن يكون أقل من " + min);
        }
    },

    datetimeOrder(start, end) {
        if (new Date(end) <= new Date(start)) {
            throw new Error("وقت النهاية يجب أن يكون بعد البداية");
        }
    }

};
range(value, min, max, name) {
    if (value < min || value > max) {
        throw new Error(name + " خارج النطاق المسموح");
    }
},

maxLength(value, max, name) {
    if (value.length > max) {
        throw new Error(name + " طويل زيادة عن اللازم");
    }
}
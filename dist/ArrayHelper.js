export var ArrayHelper;
(function (ArrayHelper) {
    function forPush(inputArr, consumer) {
        const outputArr = [];
        for (const input of inputArr) {
            outputArr.push(consumer(input));
        }
        return outputArr;
    }
    ArrayHelper.forPush = forPush;
})(ArrayHelper || (ArrayHelper = {}));

//Jay's math helpers
_.mixin({ deepClone: function (p_object) { return JSON.parse(JSON.stringify(p_object)); } });

var maths = {};
maths.heightOnSin=function(theta_min,theta_max,step,steps,amplitude,func){
    func = func || Math.sin; //Find the Sin value by default, you can also pass in Math.cos

    var percent = step/steps;
    var theta = theta_min + ((theta_max-theta_min)*percent);
    return Math.sin(theta * Math.PI) * amplitude;
};
maths.sizeFromAmountRange=function(size_min,size_max,amount,amount_min,amount_max){
    var percent = (amount-amount_min)/(amount_max-amount_min);
    return size_min+ (percent * (size_max-size_min));
};
maths.colorBlendFromAmountRange=function(color_start,color_end,amount,amount_min,amount_max){
    var percent = (amount-amount_min)/(amount_max-amount_min);

    if (color_start.substring(0,1) =="#") color_start = color_start.substring(1,7);
    if (color_end.substring(0,1) =="#") color_end = color_end.substring(1,7);

    var s_r = color_start.substring(0,2);
    var s_g = color_start.substring(2,4);
    var s_b = color_start.substring(4,6);
    var e_r = color_end.substring(0,2);
    var e_g = color_end.substring(2,4);
    var e_b = color_end.substring(4,6);

    var n_r = Math.abs(parseInt((parseInt(s_r, 16) * percent) + (parseInt(e_r, 16) * (1-percent))));
    var n_g = Math.abs(parseInt((parseInt(s_g, 16) * percent) + (parseInt(e_g, 16) * (1-percent))));
    var n_b = Math.abs(parseInt((parseInt(s_b, 16) * percent) + (parseInt(e_b, 16) * (1-percent))));
    var rgb = maths.decimalToHex(n_r) + maths.decimalToHex(n_g) + maths.decimalToHex(n_b);

    return "#"+rgb;
};
maths.decimalToHex = function(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }

    return hex;
};
maths.idealTextColor=function(bgColor) {

   var nThreshold = 150;
   var components = maths.getRGBComponents(bgColor);
   var bgDelta = (components.R * 0.299) + (components.G * 0.587) + (components.B * 0.114);

   return ((255 - bgDelta) < nThreshold) ? "#000000" : "#ffffff";
};
maths.getRGBComponents=function(color) {

    if (!color || !color.length || color.length < 6) return false;
    if (!_.str.startsWith(color,"#")) color = "#"+color;

    var r = color.substring(1, 3);
    var g = color.substring(3, 5);
    var b = color.substring(5, 7);

    return {
       R: parseInt(r, 16),
       G: parseInt(g, 16),
       B: parseInt(b, 16)
    };
};
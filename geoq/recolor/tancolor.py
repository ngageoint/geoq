from PIL import Image

_default_options = {
    'mode': 'grayscale',
    'method': '',
    'blend_weight': 5,

    'r_weight': 0.34,
    'g_weight': 0.5,
    'b_weight': 0.16,

    'r_intensity': 1,
    'g_intensity': 1,
    'b_intensity': 1,
    'r_max': 100,
    'r_min': 0,
    'g_max': 100,
    'g_min': 0,
    'b_max': 100,
    'b_min': 0,

    'mode2': '',

    'r2_intensity': 1,
    'g2_intensity': 1,
    'b2_intensity': 1,
    'r2_max': 100,
    'r2_min': 0,
    'g2_max': 100,
    'g2_min': 0,
    'b2_max': 100,
    'b2_min': 0
}

def _process_options(options):
    for num_keys in ['r_intensity', 'g_intensity', 'b_intensity', 'r_max', 'r_min', 'g_max', 'g_min', 'b_max', 'b_min',
                     'r2_intensity', 'g2_intensity', 'b2_intensity', 'r2_max', 'r2_min', 'g2_max', 'g2_min', 'b2_max', 'b2_min',
                     'blend_weight', 'r_weight', 'b_weight', 'g_weight']:
        if options.get(num_keys) is not None:
            options[num_keys] = float(options.get(num_keys))

    opts = _default_options.copy()
    opts.update(options)

    mode_defaults = {
        'red': lambda o: o.update({'r_intensity': 255}),
        'green': lambda o: o.update({'g_intensity': 255}),
        'blue': lambda o: o.update({'b_intensity': 255}),
        'blend_red': lambda o: o.update({
            'r_min': 120,
            'r_max': 255,
            'method': o['method'] or 'blend'
        }),
        'blend_green': lambda o: o.update({
            'g_min': 120,
            'g_max': 255,
            'method': o['method'] or 'blend'
        }),
        'blend_blue': lambda o: o.update({
            'b_min': 120,
            'b_max': 255,
            'method': o['method'] or 'blend'
        })
    }
    mode_defaults['replace_red'] = mode_defaults['blend_red']
    mode_defaults['replace_blue'] = mode_defaults['blend_green']
    mode_defaults['replace_green'] = mode_defaults['blend_blue']

    mode_defaults.get(opts['mode'], lambda o: o)(opts)

    mode2_defaults = {
        'blend_black': lambda o: o.update({
            'r2_min': 0,
            'r2_max': 5,
            'g2_min': 0,
            'g2_max': 5,
            'b2_min': 0,
            'b2_max': 5,
            'method': o['method'] or 'replace'
        }),
        'blend_white': lambda o: o.update({
            'r2_min': 240,
            'r2_max': 255,
            'g2_min': 240,
            'g2_max': 255,
            'b2_min': 240,
            'b2_max': 255,
            'method': o['method'] or 'replace'
        })
    }
    mode2_defaults['replace_black'] = mode2_defaults['blend_black']
    mode2_defaults['replace_white'] = mode2_defaults['blend_white']

    mode2_defaults.get(opts['mode2'], lambda o: o)(opts)

    opts['method'] = opts['method'] or 'tint'
    return opts

def tint_image(img, options={}):
    assert isinstance(img, Image.Image)

    opts = _process_options(options)

    arr = img.getdata()

    if opts['method'] == 'tint':
        edit_method = tint_pixel
    elif opts['method'] == 'blend':
        edit_method = blend_pixel
    elif opts['method'] == 'replace':
        edit_method = replace_pixel

    pixels = [edit_method(pixel, opts) for pixel in arr]

    img.putdata(pixels)

    return img

def tint_pixel(pixel, opts):
    r = pixel[0]
    g = pixel[1]
    b = pixel[2]

    brightness = opts['r_weight'] * r + opts['g_weight'] * g + opts['b_weight'] * b
    return opts['r_intensity'] * brightness, opts['g_intensity'] * brightness, opts['b_intensity'] * brightness, pixel[3]

def blend_pixel(pixel, opts):
    r = pixel[0]
    g = pixel[1]
    b = pixel[2]

    if (opts['r_min'] <= r <= opts['r_max']) and (opts['g_min'] <= g <= opts['g_max']) and (opts['b_min'] <= b <= opts['b_max']):
        pixel = _do_blend(r, g, b, pixel[3], 1, opts['blend_weight'], opts['r_intensity'], opts['g_intensity'], opts['b_intensity'])

    if (opts['r2_min'] <= r <= opts['r2_max']) and (opts['g2_min'] <= g <= opts['g2_max']) and (opts['b2_min'] <= b <= opts['b2_max']):
        pixel = _do_blend(r, g, b, pixel[3], 1, opts['blend_weight'], opts['r2_intensity'], opts['g2_intensity'], opts['b2_intensity'])

    return pixel

def _do_blend(r, g, b, a, weight_old, weight_new, r_intensity, g_intensity, b_intensity):
    return round(((r*weight_old) + (r_intensity*weight_new)) / (weight_new+weight_old)), round(((g*weight_old) + (g_intensity*weight_new)) / (weight_new+weight_old)), round(((b*weight_old) + (b_intensity*weight_new)) / (weight_new+weight_old)), a

def replace_pixel(pixel, opts):
    r = pixel[0]
    g = pixel[1]
    b = pixel[2]

    if (opts['r_min'] <= r <= opts['r_max']) and (opts['g_min'] <= g <= opts['g_max']) and (opts['b_min'] <= b <= opts['b_max']):
        pixel = round(opts['r_intensity']), round(opts['g_intensity']), round(opts['b_intensity']), pixel[3]

    if (opts['r2_min'] <= r <= opts['r2_max']) and (opts['g2_min'] <= g <= opts['g2_max']) and (opts['b2_min'] <= b <= opts['b2_max']):
        pixel = round(opts['r2_intensity']), round(opts['g2_intensity']), round(opts['b2_intensity']), pixel[3]

    return pixel

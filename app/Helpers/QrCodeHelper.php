<?php

namespace App\Helpers;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\Image\ImagickImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Renderer\RendererStyle\Fill;
use BaconQrCode\Renderer\Color\Rgb;
use BaconQrCode\Writer;

class QrCodeHelper
{
    /**
     * Generate QR Code sebagai SVG string
     */
    public static function svg(string $content, int $size = 200): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle($size, 1),
            new SvgImageBackEnd()
        );

        $writer = new Writer($renderer);
        return $writer->writeString($content);
    }

    /**
     * Generate QR Code sebagai SVG lalu encode ke base64
     * (dipakai di blade untuk <img src="data:image/svg+xml;base64,...">)
     */
    public static function svgBase64(string $content, int $size = 200): string
    {
        $svg = static::svg($content, $size);
        return base64_encode($svg);
    }

    /**
     * Generate QR Code sebagai PNG binary (butuh Imagick extension)
     */
    public static function png(string $content, int $size = 200): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle($size, 1),
            new ImagickImageBackEnd()
        );

        $writer = new Writer($renderer);
        return $writer->writeString($content);
    }

    /**
     * Generate QR Code SVG dan langsung return sebagai inline <img> tag
     */
    public static function imgTag(string $content, int $size = 200, string $class = ''): string
    {
        $b64 = static::svgBase64($content, $size);
        return sprintf(
            '<img src="data:image/svg+xml;base64,%s" width="%d" height="%d" class="%s" alt="QR Code">',
            $b64, $size, $size, htmlspecialchars($class)
        );
    }
}
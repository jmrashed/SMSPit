<?php

use App\Http\Middleware\ValidateApiKey;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Exception\RequestExceptionInterface;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['api.key' => ValidateApiKey::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Standardize every api/* error response to { code, message,
        // details }, matching sms-service's convention (see
        // sms-service/src/common/filters/http-exception.filter.ts)
        // so the API surface reads the same across services.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof ValidationException) {
                return response()->json([
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Validation failed',
                    'details' => collect($e->errors())->flatten()->values()->all(),
                ], 422);
            }

            if ($e instanceof HttpExceptionInterface || $e instanceof RequestExceptionInterface) {
                $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 400;
                $text = Response::$statusTexts[$status] ?? 'Error';

                return response()->json([
                    'code' => strtoupper(str_replace(' ', '_', $text)),
                    'message' => $e->getMessage() ?: $text,
                    'details' => null,
                ], $status);
            }

            return response()->json([
                'code' => 'INTERNAL_SERVER_ERROR',
                'message' => 'Internal server error',
                'details' => null,
            ], 500);
        });
    })->create();

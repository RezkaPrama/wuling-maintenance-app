<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiResponseMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only apply to JSON responses
        if ($response instanceof JsonResponse) {
            $data = $response->getData(true);
            
            // If response doesn't have the standard format, format it
            if (!isset($data['success'])) {
                $statusCode = $response->getStatusCode();
                
                if ($statusCode >= 200 && $statusCode < 300) {
                    $response->setData([
                        'success' => true,
                        'message' => 'Success',
                        'data' => $data
                    ]);
                } else {
                    $response->setData([
                        'success' => false,
                        'message' => 'Error',
                        'data' => $data
                    ]);
                }
            }
        }

        return $response;
    }
}

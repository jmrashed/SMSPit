<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'owner_id' => ['required', 'integer', 'exists:users,id'],
            'scopes' => ['sometimes', 'array'],
            'scopes.*' => ['string'],
        ];
    }
}

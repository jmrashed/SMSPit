<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class StoreOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any authenticated user (any valid API key) can create an
        // organization -- they become its first admin (see
        // OrganizationController::store). There's no "who's allowed to
        // create orgs at all" restriction at this stage.
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('slug') && $this->filled('name')) {
            $this->merge(['slug' => Str::slug((string) $this->input('name'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:organizations,slug'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Models\Organization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'org_id' => ['sometimes', 'nullable', 'integer', 'exists:organizations,id'],
            'scopes' => ['sometimes', 'array'],
            'scopes.*' => ['string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $orgId = $this->input('org_id');
            $ownerId = $this->input('owner_id');

            if (! $orgId || ! $ownerId) {
                return;
            }

            $organization = Organization::find($orgId);
            if ($organization && ! $organization->users()->wherePivot('user_id', $ownerId)->exists()) {
                $validator->errors()->add('org_id', 'The owner must be a member of this organization.');
            }
        });
    }
}

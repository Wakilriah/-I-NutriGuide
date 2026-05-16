# Admin Panel Guide - React + Vite + TypeScript

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Query
- Zustand
- Axios
- React Hook Form
- Zod
- TanStack Table
- Recharts
- Vitest
- React Testing Library

## State Management

Use:

- React Query for server state.
- Zustand for local UI/auth state.

Do not use Redux.

## Admin App Structure

```txt
apps/admin-panel/
|-- src/
|   |-- api/
|   |-- app/
|   |-- auth/
|   |-- components/
|   |-- features/
|   |   |-- auth/
|   |   |-- dashboard/
|   |   |-- feedback/
|   |   |-- knowledge/
|   |   |-- recommendations/
|   |   |-- rules/
|   |   `-- users/
|   |-- lib/
|   |-- router/
|   |-- stores/
|   |-- test/
|   |-- types/
|   `-- main.tsx
|-- Dockerfile
`-- README.md
```

## Required Pages

### Auth

- Login page
- Protected route wrapper
- Logout
- Token refresh handling

### Dashboard

Show:

- Total users
- Total foods
- Total supplements
- Total recommendations generated
- Average feedback rating
- Most used supplements
- Most recommended foods

### Foods Management

Features:

- List foods
- Search foods
- Filter by category
- Filter by source such as CIQUAL
- Show CIQUAL source/code for imported foods
- Create food
- Edit food
- Soft-delete/deactivate food
- Manage food nutrients

The Django admin also exposes CIQUAL source/code fields for foods and categories, searchable by CIQUAL code/source/category, with source/category filters to keep large imported datasets manageable.

### Nutrients Management

Features:

- List nutrients
- Create nutrient
- Edit nutrient
- Delete/deactivate nutrient

### Supplements Management

Features:

- List supplements
- Create supplement
- Edit supplement
- Manage supplement nutrients
- Activate/deactivate supplement

### Rules Management

Features:

- List association rules
- Create rule
- Edit rule
- Enable/disable rule
- Show support/confidence/lift
- Show explanation

### Users Management

Features:

- List users
- View profile
- View user supplements
- View recommendation history
- Do not expose password hashes

### Recommendation Logs

Features:

- List recommendation runs
- View recommendation item details
- View generated explanations
- Filter by user/supplement/date

### Feedback

Features:

- View ratings
- View comments
- Filter by food/supplement/user

## API Client

Use a single Axios instance:

```ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});
```

Add interceptor:

- Attach access token.
- Refresh token on 401 if possible.
- Logout on refresh failure.

## React Query Conventions

Query keys examples:

```ts
['foods']
['food', foodId]
['supplements']
['rules']
['admin-dashboard']
```

Mutation pattern:

- Use mutation for create/update/delete.
- Invalidate related query after success.
- Show toast notification.

## Zustand Store Usage

Use Zustand for:

- Access token/refresh token storage pointer
- Current admin user
- Sidebar open/closed
- Theme
- UI filters if not URL-based

## Forms

Use:

- React Hook Form
- Zod validation
- Shadcn form components

Every create/edit form must validate required fields.

## Admin Testing

Required tests:

- Login form validates inputs.
- Protected route redirects unauthenticated user.
- Foods table renders server data.
- Create food form calls mutation.
- Rules form validates support/confidence/lift.
- Dashboard renders metric cards.

## Completion Rule

An admin feature is complete only when:

1. Page exists.
2. API hook exists.
3. Loading state exists.
4. Error state exists.
5. Empty state exists.
6. Form validation exists if needed.
7. Tests pass.
8. The page works against Docker backend.

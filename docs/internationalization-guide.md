# SyncroSpace Internationalization (i18n) Guide

## Table of Contents
1. [Introduction](#introduction)
2. [i18n Architecture](#i18n-architecture)
3. [Setting Up i18n in the Project](#setting-up-i18n-in-the-project)
4. [Managing Translations](#managing-translations)
5. [Best Practices](#best-practices)
6. [Date, Time, and Number Formatting](#date-time-and-number-formatting)
7. [RTL Support](#rtl-support)
8. [Testing Translations](#testing-translations)
9. [Adding a New Language](#adding-a-new-language)
10. [Translation Workflow](#translation-workflow)
11. [i18n for API Responses](#i18n-for-api-responses)
12. [Accessibility Considerations](#accessibility-considerations)
13. [Performance Optimization](#performance-optimization)
14. [Common Issues and Solutions](#common-issues-and-solutions)

## Introduction

This guide covers the internationalization (i18n) approach for SyncroSpace, providing developers with the information needed to build and maintain multilingual support throughout the application.

### Goals of i18n in SyncroSpace

- Support for multiple languages across all user interfaces
- Culturally appropriate formatting for dates, times, numbers, and currencies
- Right-to-left (RTL) language support
- Accessibility across languages
- Efficient translation management workflow

### Supported Languages

Currently, SyncroSpace supports or plans to support the following languages:

1. English (en) - Default
2. Spanish (es)
3. French (fr)
4. German (de)
5. Japanese (ja)
6. Portuguese (pt)
7. Arabic (ar) - RTL support required
8. Chinese (Simplified) (zh-CN)

## i18n Architecture

SyncroSpace uses next-intl for internationalization, integrated with Next.js for server-side and client-side translation support.

### Technology Stack

- **next-intl**: Core i18n library
- **Next.js App Router**: Routing with i18n support
- **React Server Components**: Server-side rendered translations
- **Client Components**: For interactive UI elements with translations
- **Tailwind CSS**: For RTL and language-specific styling

### Directory Structure

```
/src
  /i18n
    /locales          # Translation files
      /en             # English translations
        common.json
        auth.json
        spaces.json
        ...
      /es             # Spanish translations
        ...
      /fr             # French translations
        ...
    /config.ts        # i18n configuration
    /client.ts        # Client-side i18n setup
    /server.ts        # Server-side i18n setup
    /formatters.ts    # Custom formatters
  /middleware.ts      # Includes language detection and routing
  /app
    /[locale]         # Root layout with locale parameter
      /layout.tsx     # Root layout with i18n provider
```

## Setting Up i18n in the Project

### Installation

```bash
npm install next-intl
```

### Configuration

Create the base configuration file at `src/i18n/config.ts`:

```typescript
export const defaultLocale = 'en';

export const locales = ['en', 'es', 'fr', 'de', 'ja', 'pt', 'ar', 'zh-CN'] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  pt: 'Português',
  ar: 'العربية',
  'zh-CN': '简体中文',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  es: 'ltr',
  fr: 'ltr',
  de: 'ltr',
  ja: 'ltr',
  pt: 'ltr',
  ar: 'rtl',
  'zh-CN': 'ltr',
};
```

### Next.js Integration

Update `middleware.ts` to handle locale detection and routing:

```typescript
import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  // A list of all locales that are supported
  locales: locales as unknown as string[],
  
  // Used when no locale matches
  defaultLocale,
  
  // Allow locale detection using Accept-Language header and cookies
  localeDetection: true,
});

export const config = {
  // Match all pathnames except for those starting with /api/, /_next/, /_vercel/,
  // /favicon.ico, /robots.txt, etc.
  matcher: ['/((?!api|_next|_vercel|favicon.ico|robots.txt).*)'],
};
```

### Root Layout Setup

Update the root layout to use locale parameter and provide i18n context:

```typescript
// src/app/[locale]/layout.tsx
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales, localeDirections } from '@/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }
  
  // Load the messages for the current locale
  let messages;
  try {
    messages = (await import(`@/i18n/locales/${locale}/index`)).default;
  } catch (error) {
    notFound();
  }
  
  // Determine text direction based on locale
  const dir = localeDirections[locale as keyof typeof localeDirections] || 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## Managing Translations

### Translation File Structure

Each language has its own directory with modular JSON files for different sections of the application:

```
/en
  common.json     # Shared translations across the app
  auth.json       # Authentication-related translations
  spaces.json     # Virtual spaces translations
  tasks.json      # Task management translations
  settings.json   # User settings translations
  marketing.json  # Marketing page translations
```

### Sample Translation File

Example of `en/common.json`:

```json
{
  "app": {
    "name": "SyncroSpace",
    "tagline": "Your Team's Digital Headquarters"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create"
  },
  "navigation": {
    "home": "Home",
    "spaces": "Spaces",
    "tasks": "Tasks",
    "chat": "Chat",
    "settings": "Settings"
  },
  "errors": {
    "general": "Something went wrong",
    "notFound": "Page not found",
    "unauthorized": "You are not authorized to view this page"
  }
}
```

### Using Translations in Components

#### Server Components

```tsx
// src/app/[locale]/page.tsx
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('common');
  
  return (
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  );
}
```

#### Client Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function ActionButton() {
  const t = useTranslations('common');
  
  return (
    <button onClick={() => alert('Clicked!')}>
      {t('actions.save')}
    </button>
  );
}
```

### Handling Pluralization

```tsx
const t = useTranslations('tasks');

// In tasks.json:
// "count": {
//   "one": "You have {count} task",
//   "other": "You have {count} tasks"
// }

return <p>{t('count', { count: taskCount })}</p>;
```

### Rich Text Formatting

```tsx
const t = useTranslations('common');

// In common.json:
// "welcome": "Welcome to <bold>{appName}</bold>! Let's get started."

return (
  <p>
    {t.rich('welcome', {
      appName: 'SyncroSpace',
      bold: (chunks) => <strong>{chunks}</strong>
    })}
  </p>
);
```

## Best Practices

### Key Structure

1. **Use Namespaces**: Organize translations by feature or section
   ```
   "spaces": {
     "create": {
       "title": "Create New Space",
       "button": "Create Space"
     }
   }
   ```

2. **Consistent Naming**: Use consistent key naming patterns
   ```
   "spaces.create.title"
   "tasks.create.title"
   ```

3. **Avoid Deep Nesting**: Keep nesting to 3-4 levels maximum

### Translation Tips

1. **Provide Context**: Add comments in translation files for context
   ```
   "welcome_message": "Welcome back, {name}!", // Shown on dashboard after login
   ```

2. **Avoid String Concatenation**: Use formatting instead
   ```
   // Bad
   t('prefix') + userName + t('suffix')
   
   // Good
   t('welcome', { name: userName })
   ```

3. **Handle Dynamic Content**: Use rich text formatting for embedded markup

4. **Extraction and Maintenance**: Regularly extract missing translations

## Date, Time, and Number Formatting

### Setting Up Formatters

Create custom formatters in `src/i18n/formatters.ts`:

```typescript
import { createFormatter } from 'next-intl';

export const dateFormatter = createFormatter({
  onFormatting({ locale, format, value }) {
    const date = new Date(value);
    
    const options: Intl.DateTimeFormatOptions = 
      format === 'short' ? { month: 'numeric', day: 'numeric', year: 'numeric' } :
      format === 'long' ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } :
      {};
      
    return new Intl.DateTimeFormat(locale, options).format(date);
  }
});

export const numberFormatter = createFormatter({
  onFormatting({ locale, format, value }) {
    const options: Intl.NumberFormatOptions = 
      format === 'currency' ? { style: 'currency', currency: 'USD' } :
      format === 'percent' ? { style: 'percent', maximumFractionDigits: 2 } :
      {};
      
    return new Intl.NumberFormat(locale, options).format(value);
  }
});
```

### Using Formatters

```tsx
import { useFormatter } from 'next-intl';

export default function TaskDueDate({ date }) {
  const format = useFormatter();
  
  return (
    <time dateTime={date.toISOString()}>
      {format.dateTime(date, 'long')}
    </time>
  );
}
```

### Currency Formatting

```tsx
const format = useFormatter();

// Show price in user's locale format
return <p>{format.number(29.99, 'currency')}</p>;
```

## RTL Support

### Setting Up RTL Support

1. **Configure Tailwind for RTL**:

Update `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      textDirection: {
        rtl: 'rtl',
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'),
  ],
};
```

2. **Create RTL-Aware Components**:

```tsx
import { useLocale } from 'next-intl';
import { localeDirections } from '@/i18n/config';

export function IconButton({ icon, label }) {
  const locale = useLocale();
  const isRtl = localeDirections[locale] === 'rtl';
  
  return (
    <button className={`flex items-center ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
      {icon}
      <span className={isRtl ? 'mr-2' : 'ml-2'}>{label}</span>
    </button>
  );
}
```

3. **RTL-Specific Styling**:

```tsx
// Use logical properties
<div className="ps-4 pe-2 ms-auto me-0">
  {content}
</div>
```

### RTL Testing

Create dedicated RTL testing scenarios:

```typescript
describe('Layout in RTL mode', () => {
  beforeEach(() => {
    // Setup RTL mode for testing
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  });
  
  it('should align elements correctly in RTL mode', () => {
    // Test RTL layout behavior
  });
  
  afterEach(() => {
    // Reset after tests
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });
});
```

## Testing Translations

### Unit Testing Translations

```typescript
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'next-intl';
import HomePage from './HomePage';
import enMessages from '@/i18n/locales/en/common.json';

describe('HomePage', () => {
  it('renders translated content correctly', () => {
    render(
      <IntlProvider locale="en" messages={enMessages}>
        <HomePage />
      </IntlProvider>
    );
    
    expect(screen.getByText('Your Team\'s Digital Headquarters')).toBeInTheDocument();
  });
});
```

### Testing Missing Translations

Create a script to verify all translations exist across languages:

```javascript
// scripts/check-translations.js
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const languages = fs.readdirSync(localesDir).filter(file => 
  fs.statSync(path.join(localesDir, file)).isDirectory()
);

// Get reference keys from English translations
const getKeysFromObject = (obj, prefix = '') => {
  return Object.entries(obj).flatMap(([key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getKeysFromObject(value, newKey);
    }
    return [newKey];
  });
};

// Get English keys as reference
const enFiles = fs.readdirSync(path.join(localesDir, 'en'))
  .filter(file => file.endsWith('.json'));

const referenceKeys = {};

enFiles.forEach(file => {
  const namespace = file.replace('.json', '');
  const content = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', file), 'utf8'));
  referenceKeys[namespace] = getKeysFromObject(content);
});

// Check each language against reference keys
languages.forEach(lang => {
  if (lang === 'en') return; // Skip English
  
  console.log(`\nChecking ${lang} translations:`);
  let missingCount = 0;
  
  Object.entries(referenceKeys).forEach(([namespace, keys]) => {
    try {
      const langFilePath = path.join(localesDir, lang, `${namespace}.json`);
      if (!fs.existsSync(langFilePath)) {
        console.log(`  Missing file: ${namespace}.json`);
        missingCount += keys.length;
        return;
      }
      
      const langContent = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
      const langKeys = getKeysFromObject(langContent);
      
      keys.forEach(key => {
        if (!langKeys.includes(key)) {
          console.log(`  Missing key in ${namespace}.json: ${key}`);
          missingCount++;
        }
      });
    } catch (error) {
      console.error(`  Error checking ${namespace}.json:`, error.message);
    }
  });
  
  console.log(`  Total missing translations: ${missingCount}`);
});
```

## Adding a New Language

### Step-by-Step Process

1. **Create Language Directory and Files**:

```bash
mkdir -p src/i18n/locales/it
cp src/i18n/locales/en/*.json src/i18n/locales/it/
```

2. **Update Configuration**:

```typescript
// src/i18n/config.ts
export const locales = [
  'en', 'es', 'fr', 'de', 'ja', 'pt', 'ar', 'zh-CN', 'it'
] as const;

export const localeNames: Record<Locale, string> = {
  // existing entries...
  it: 'Italiano',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  // existing entries...
  it: 'ltr',
};
```

3. **Translate Content**:

Replace the English content in the copied JSON files with Italian translations.

4. **Test the New Language**:

Navigate to `/it` routes to verify translations appear correctly.

5. **Add Language Selector**:

Update the language selector component to include the new language.

## Translation Workflow

### Translation Management Process

1. **Extract Strings for Translation**:

Create a script to extract strings that need translation:

```javascript
// scripts/extract-translations.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all source files
const sourceFiles = glob.sync('src/**/*.{ts,tsx}');

// Extract t() calls with regex
const translationCalls = [];
const tCallRegex = /useTranslations\(['"](.*?)['"].*?\)\.(?:rich)?\(['"](.+?)['"]/g;

sourceFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  
  while ((match = tCallRegex.exec(content)) !== null) {
    const [, namespace, key] = match;
    translationCalls.push(`${namespace}.${key}`);
  }
});

console.log('Found translation keys:', translationCalls.length);
fs.writeFileSync('translation-keys.json', JSON.stringify(translationCalls, null, 2));
```

2. **Send to Translators**:

Export translation files in a format suitable for translators (e.g., CSV or XLIFF).

3. **Import Completed Translations**:

Create a script to import translated content back into JSON files.

4. **Review and Validate**:

Validate formatting, check for missing translations, and review for context.

### Using Translation Management Systems

Consider integrating with services like:
- Lokalise
- Crowdin
- POEditor
- Phrase

Integration example with Lokalise:

```javascript
// scripts/lokalise-sync.js
const { LokaliseApi } = require('@lokalise/node-api');

const apiKey = process.env.LOKALISE_API_KEY;
const projectId = process.env.LOKALISE_PROJECT_ID;

const lokaliseApi = new LokaliseApi({ apiKey });

async function downloadTranslations() {
  const response = await lokaliseApi.files().download(projectId, {
    format: 'json',
    original_filenames: true,
    directory_prefix: '%LANG_ISO%/',
    filter_langs: ['en', 'es', 'fr', 'de', 'ja', 'pt', 'ar', 'zh_CN', 'it'],
    export_empty_as: 'skip'
  });
  
  console.log('Download URL:', response.bundle_url);
}

downloadTranslations().catch(console.error);
```

## i18n for API Responses

### Server-Side Translation Strategy

1. **Accept-Language Header**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTranslator } from 'next-intl/server';

export async function GET(request: NextRequest) {
  // Extract language from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language') || 'en';
  const locale = acceptLanguage.split(',')[0].split('-')[0];
  
  // Get translator for requested locale
  const t = await getTranslator(locale, 'api');
  
  return NextResponse.json({
    message: t('success.item_created'),
    data: {
      // ...
    }
  });
}
```

2. **Locale Parameter**:

```typescript
// src/app/api/[locale]/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTranslator } from 'next-intl/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string } }
) {
  const t = await getTranslator(params.locale, 'api');
  
  return NextResponse.json({
    message: t('success.items_retrieved'),
    data: [
      // ...
    ]
  });
}
```

### Error Messages

Create a dedicated translation file for API error messages:

```json
// src/i18n/locales/en/api.json
{
  "errors": {
    "not_found": "Resource not found",
    "unauthorized": "You are not authorized to access this resource",
    "validation": {
      "required": "{field} is required",
      "email": "Please enter a valid email address",
      "min_length": "{field} must be at least {min} characters long"
    }
  },
  "success": {
    "item_created": "Item created successfully",
    "item_updated": "Item updated successfully",
    "item_deleted": "Item deleted successfully"
  }
}
```

## Accessibility Considerations

### i18n and Accessibility

1. **Language Attribute**:

Ensure the `lang` attribute is correctly set:

```tsx
<html lang={locale} dir={dir}>
```

2. **Screen Reader Considerations**:

```tsx
// Translating ARIA labels
<button
  aria-label={t('buttons.close')}
  onClick={onClose}
>
  <CloseIcon />
</button>
```

3. **Respecting User Preferences**:

```typescript
// Check browser/system language preferences
const getBrowserLanguage = () => {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language.split('-')[0];
  return locales.includes(browserLang as any) ? browserLang : 'en';
};
```

## Performance Optimization

### Optimizing i18n Performance

1. **Code Splitting by Language**:

```typescript
// src/app/[locale]/layout.tsx
// Dynamic import of locale data
const messages = await import(`@/i18n/locales/${locale}/index`);
```

2. **Message Caching**:

```typescript
// Cache for loaded translation messages
const messageCache = new Map();

export async function getMessages(locale: string) {
  if (messageCache.has(locale)) {
    return messageCache.get(locale);
  }
  
  const messages = await import(`@/i18n/locales/${locale}/index`);
  messageCache.set(locale, messages.default);
  return messages.default;
}
```

3. **Selective Loading**:

Only load translations needed for the current page:

```typescript
// src/app/[locale]/spaces/page.tsx
const messages = await import(`@/i18n/locales/${locale}/spaces`);
```

## Common Issues and Solutions

### Troubleshooting i18n

1. **Missing Translations**:

**Problem**: Translation keys appear instead of translated text
**Solution**: Check that the key exists in the translation file and that the namespace is correct

2. **RTL Layout Issues**:

**Problem**: Layout breaks in RTL languages
**Solution**: Use logical properties (start/end) instead of directional properties (left/right)

3. **Date Formatting Errors**:

**Problem**: Dates display incorrectly in some locales
**Solution**: Ensure proper use of Intl.DateTimeFormat with appropriate options

4. **Context Switching**:

**Problem**: Translations don't update when changing language
**Solution**: Ensure the entire app is wrapped in the i18n provider and that locale changes trigger a re-render

5. **Character Encoding**:

**Problem**: Special characters display incorrectly
**Solution**: Ensure proper UTF-8 encoding for all translation files

### FAQ

1. **How do I add a new translation key?**
   - Add it to English first, then run the translation extraction script

2. **How do I handle pluralization across languages?**
   - Use the pluralization features of next-intl based on ICU message format

3. **How do I test RTL layout?**
   - Use the language selector to switch to Arabic or another RTL language

4. **Can I use HTML in translations?**
   - Use the rich text formatting feature with appropriate components
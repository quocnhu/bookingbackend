-- Seed a default company profile so the print voucher is readable before admin edits it.

INSERT INTO "CompanyProfile" (id, name, address, phone, email, "taxId", website, "createdAt", "updatedAt")
VALUES (
  'default-company',
  'SunShine Travel & Transportation Co., Ltd.',
  '88 Bach Dang Street, Hai Chau District, Da Nang, Vietnam',
  '+84 236 3888 999',
  'hello@sunshine-travel.vn',
  '0317412086',
  'https://sunshine-travel.vn',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
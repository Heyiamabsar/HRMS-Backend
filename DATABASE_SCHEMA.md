# HRMS Backend - Database Schema

## Entity Relationship Overview

```
┌─────────────────┐
│     Branch      │
│─────────────────│
│ _id             │◄──────┐
│ branchName      │       │
│ country         │       │
│ branchCode      │       │
│ weekends[]      │       │
│ timeZone        │       │
│ address         │       │
└─────────────────┘       │
                          │
                          │
┌─────────────────────────┼───────────────────────────┐
│                         │                           │
│     ┌───────────────────┴─────┐                     │
│     │        User             │                     │
│     │─────────────────────────│                     │
│     │ _id                     │◄────────┐           │
│     │ first_name, last_name   │         │           │
│     │ email (unique)          │         │           │
│     │ password (hashed)       │         │           │
│     │ phone                   │         │           │
│     │ userId                  │         │           │
│     │ role (enum)             │         │           │
│     │ status (enum)           │         │           │
│     │ department              │         │           │
│     │ designation             │         │           │
│     │ joining_date            │         │           │
│     │ salary                  │         │           │
│     │ branch (ref)            ├─────────┘           │
│     │ timeZone                │                     │
│     │ sickLeaves              │                     │
│     │ unpaidLeaves            │                     │
│     │ isDeleted               │                     │
│     │ address{}               │                     │
│     │ payrollDetails{}        │                     │
│     │ profileImageUrl         │                     │
│     │ uploads[]               │                     │
│     │ attendance[]            │                     │
│     │ leaves[]                │                     │
│     └─────────────────────────┘                     │
│              │                                       │
│              │                                       │
│     ┌────────┼────────────────┐                     │
│     │        │                │                     │
│     │        │                │                     │
│     ▼        ▼                ▼                     │
│ ┌────────┐ ┌──────────┐ ┌──────────┐              │
│ │Attendance Leave     │ │ Payroll  │              │
│ │────────│ │──────────│ │──────────│              │
│ │_id     │ │_id       │ │_id       │              │
│ │userId  │ │employee  │ │userId    │              │
│ │date    │ │userId    │ │month     │              │
│ │inTime  │ │reason    │ │year      │              │
│ │outTime │ │fromDate  │ │basicSalary│             │
│ │duration│ │toDate    │ │grossSalary│             │
│ │status  │ │leaveType │ │netSalary │              │
│ │location│ │status    │ │present   │              │
│ │        │ │leaveTaken│ │absent    │              │
│ │        │ │leaveBalance halfDay   │              │
│ │        │ │          │ │sick      │              │
│ └────────┘ └──────────┘ │unpaid    │              │
│                         │overtime  │              │
│                         │allowances│              │
│                         │deductions│              │
│                         │status    │              │
│                         │payDate   │              │
│                         └──────────┘              │
│                                                    │
│     ┌──────────────────┐                          │
│     │    Holiday       │                          │
│     │──────────────────│                          │
│     │ _id              │                          │
│     │ date             │                          │
│     │ reason           │                          │
│     │ branch (ref)     ├──────────────────────────┘
│     │ isCustom         │
│     │ isOptional       │
│     └──────────────────┘
│
│     ┌──────────────────┐
│     │  Notification    │
│     │──────────────────│
│     │ _id              │
│     │ forRoles[]       │
│     │ title            │
│     │ message          │
│     │ link             │
│     │ type             │
│     │ performedBy (ref)│
│     │ isRead           │
│     │ timestamp        │
│     └──────────────────┘
│
│     ┌──────────────────┐
│     │  RefreshToken    │
│     │──────────────────│
│     │ _id              │
│     │ userId (ref)     │
│     │ token            │
│     └──────────────────┘
│
│     ┌──────────────────┐
│     │  Department      │
│     │──────────────────│
│     │ _id              │
│     │ name             │
│     └──────────────────┘
│
│     ┌──────────────────┐
│     │  Designation     │
│     │──────────────────│
│     │ _id              │
│     │ name             │
│     └──────────────────┘
│
│     ┌──────────────────┐
│     │  FileUpload      │
│     │──────────────────│
│     │ _id              │
│     │ employee (ref)   │
│     │ document         │
│     │ cloudinary_id    │
│     └──────────────────┘
│
│     ┌──────────────────┐
│     │  DailyReport     │
│     │──────────────────│
│     │ _id              │
│     │ userId (ref)     │
│     │ date             │
│     │ task             │
│     │ status           │
│     └──────────────────┘
│
└     ┌──────────────────┐
      │  CountryTZ       │
      │──────────────────│
      │ _id              │
      │ name             │
      │ tz               │
      │ code             │
      └──────────────────┘
```

---

## Detailed Schema Definitions

### 1. User Collection
**Collection Name**: `users`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| first_name | String | Yes | - | First name (2-50 chars) |
| last_name | String | No | - | Last name (max 50 chars) |
| email | String | Yes | - | Unique email (validated) |
| password | String | Yes | - | Bcrypt hashed (min 6 chars) |
| phone | String | Yes | - | International format |
| userId | String | Yes | - | Employee ID |
| role | String | Yes | employee | superAdmin, admin, hr, employee |
| status | String | Yes | inactive | active, inactive |
| department | String | Yes | - | Department name |
| designation | String | Yes | - | Job designation |
| joining_date | Date | Yes | - | Date of joining |
| salary | Number | Yes | - | Monthly salary (≥0) |
| branch | ObjectId | No | - | Ref to Branch |
| timeZone | String | No | - | User's timezone |
| sickLeaves | Number | No | 0 | Sick leave count |
| unpaidLeaves | Number | No | 0 | Unpaid leave count |
| isDeleted | Boolean | No | false | Soft delete flag |
| address | Object | Yes | - | Address details |
| address.country | String | Yes | - | Country name |
| address.state | String | Yes | - | State name |
| address.city | String | Yes | - | City name |
| address.village | String | No | - | Village name |
| address.address_line | String | No | - | Address line |
| address.pincode | String | No | - | 6-digit pincode |
| payrollDetails | Object | No | - | Payroll information |
| payrollDetails.BankName | String | No | - | Bank name |
| payrollDetails.accountNumber | Number | No | - | Account number |
| payrollDetails.pfNumber | Number | No | - | PF number |
| payrollDetails.ifscCode | String | No | - | IFSC code |
| payrollDetails.UNA | Number | No | - | UNA number |
| profileImageUrl | String | No | '' | Profile image URL |
| uploads | [ObjectId] | No | [] | Refs to Upload |
| attendance | [ObjectId] | No | [] | Refs to Attendance |
| leaves | [ObjectId] | No | [] | Refs to Leave |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

**Indexes**:
- `email`: unique index
- `{first_name: "text", last_name: "text", email: "text", department: "text", designation: "text"}`: text search

**Pre-save Hook**: Hashes password using bcrypt before saving

---

### 2. Attendance Collection
**Collection Name**: `attendances`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| userId | ObjectId | No | - | Ref to User |
| User | ObjectId | No | - | Ref to User (duplicate?) |
| date | String | Yes | - | Date in 'YYYY-MM-DD' format |
| inTime | Date | No | - | Check-in timestamp |
| outTime | Date | No | - | Check-out timestamp |
| duration | String | No | - | Duration in 'HH:mm:ss' |
| status | String | Yes | Absent | Present, Absent, Leave, Half Day, Weekend, Over Time, Holiday |
| location | Object | No | {checkIn:{}, checkOut:{}} | Location details |
| location.checkIn | Object | No | {} | Check-in location |
| location.checkIn.latitude | Number | No | - | Latitude |
| location.checkIn.longitude | Number | No | - | Longitude |
| location.checkIn.address | Object | No | - | Address object |
| location.checkIn.displayName | String | No | - | Location name |
| location.checkIn.punchedFrom | String | No | - | Web/Mobile |
| location.checkOut | Object | No | {} | Check-out location |
| location.checkOut.latitude | Number | No | - | Latitude |
| location.checkOut.longitude | Number | No | - | Longitude |
| location.checkOut.address | Object | No | - | Address object |
| location.checkOut.displayName | String | No | - | Location name |
| location.checkOut.punchedFrom | String | No | - | Web/Mobile |
| userName | String | No | - | Denormalized user name |
| userEmail | String | No | - | Denormalized user email |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

**Indexes**:
- `{userName: "text", userEmail: "text"}`: text search
- `{userId: 1, date: 1}`: unique compound index

---

### 3. Leave Collection
**Collection Name**: `leaves`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| employee | ObjectId | No | - | Ref to User |
| Attendance | ObjectId | No | - | Ref to Attendance |
| userId | ObjectId | No | - | Ref to User |
| reason | String | Yes | - | Leave reason |
| fromDate | Date | Yes | - | Start date |
| toDate | Date | Yes | - | End date |
| leaveType | String | Yes | - | vacation, sick, casual, LOP, unpaid, firstHalf, secondHalf |
| status | String | Yes | pending | pending, approved, rejected, cancelled, cancelled by user |
| sickLeave | Number | No | 0 | Sick leave days |
| unPaidLeave | Number | No | 0 | Unpaid leave days |
| maximumLeave | Number | Yes | 14 | Maximum allowed leaves |
| leaveTaken | Number | Yes | 0 | Total leaves taken |
| leaveBalance | Number | Yes | 14 | Remaining leave balance |
| userName | String | No | - | Denormalized user name |
| userEmail | String | No | - | Denormalized user email |
| appliedAt | Date | No | now | Application timestamp |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

**Indexes**:
- `{userName: "text", userEmail: "text"}`: text search

---

### 4. Payroll Collection
**Collection Name**: `payrolls`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| userId | ObjectId | No | - | Ref to User |
| User | ObjectId | No | - | Ref to User |
| modifiedBy | ObjectId | No | - | Ref to User (modifier) |
| month | String | No | - | January-December |
| year | Number | No | - | Year (≥2000) |
| present | Number | No | 0 | Present days (≥0) |
| absent | Number | No | 0 | Absent days (≥0) |
| halfDay | Number | No | 0 | Half days (≥0) |
| unpaid | Number | No | 0 | Unpaid days (≥0) |
| sick | Number | No | 0 | Sick days (≥0) |
| overtime | Number | No | 0 | Overtime days (≥0) |
| basicSalary | Number | Yes | - | Basic salary (≥0) |
| grossSalary | Number | Yes | - | Gross salary (≥0) |
| netSalary | Number | Yes | - | Net salary (≥0) |
| medicalAllowance | Number | No | 0 | Medical allowance (≥0) |
| conveyanceAllowance | Number | No | 0 | Conveyance allowance (≥0) |
| specialAllowance | Number | No | 0 | Special allowance (≥0) |
| travelingAllowance | Number | No | 0 | Traveling allowance (≥0) |
| hra | Number | No | 0 | HRA (≥0) |
| totalDays | Number | No | 0 | Total working days (≥0) |
| workedDays | Number | No | 0 | Actual worked days (≥0) |
| PAN | String | No | 0 | PAN number |
| TDS | Number | No | 0 | TDS amount (≥0) |
| holidayPayout | Number | No | 0 | Holiday payout (≥0) |
| totalAllowances | Number | No | 0 | Sum of allowances (≥0) |
| totalDeductions | Number | No | 0 | Sum of deductions (≥0) |
| bonuses | Number | No | 0 | Bonus amount (≥0) |
| paymentMethod | String | Yes | Bank Transfer | Bank Transfer, Cash, Cheque, UPI |
| pfDeduction | Number | No | 0 | PF deduction (≥0) |
| loanDeduction | Number | No | 0 | Loan deduction (≥0) |
| ptDeduction | Number | No | 0 | PT deduction (≥0) |
| generatedAt | Date | No | now | Generation timestamp |
| adminPermission | Boolean | No | false | Admin approval flag |
| status | String | Yes | pending | pending, processed, paid, onHold |
| payDate | Date | No | - | Payment date |
| modifiedAt | Date | No | - | Modification timestamp |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

---

### 5. Branch Collection
**Collection Name**: `branches`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| branchName | String | Yes | - | Branch name |
| country | String | Yes | - | Country name |
| branchCode | String | Yes | - | Unique branch code |
| associatedUsers | Number | No | 0 | Number of users |
| address | String | Yes | - | Branch address |
| weekends | [String] | No | ["Sunday"] | Weekend days |
| timeZone | String | No | - | Branch timezone |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

**Indexes**:
- `branchCode`: unique index

---

### 6. Holiday Collection
**Collection Name**: `holidays`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| date | Date | Yes | - | Holiday date |
| reason | String | Yes | - | Holiday reason |
| branch | ObjectId | Yes | - | Ref to Branch |
| isCustom | Boolean | No | false | Custom holiday flag |
| isOptional | Boolean | No | false | Optional holiday flag |

**Indexes**:
- `{date: 1, branch: 1}`: unique compound index

---

### 7. Department Collection
**Collection Name**: `departments`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| name | String | Yes | - | Department name |

---

### 8. Designation Collection
**Collection Name**: `designations`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| name | String | Yes | - | Designation name |

---

### 9. Notification Collection
**Collection Name**: `notifications`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| forRoles | [String] | No | - | Target roles |
| title | String | No | - | Notification title |
| message | String | No | - | Notification message |
| link | String | No | - | Related link |
| type | String | No | - | Notification type |
| performedBy | ObjectId | No | - | Ref to User |
| isRead | Boolean | No | false | Read status |
| timestamp | Date | No | now | Timestamp |

---

### 10. RefreshToken Collection
**Collection Name**: `refreshtokens`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| userId | ObjectId | No | - | Ref to User |
| token | String | No | - | JWT refresh token |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

---

### 11. FileUpload Collection
**Collection Name**: `uploads`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| employee | ObjectId | No | - | Ref to User |
| document | String | No | - | Document URL |
| cloudinary_id | String | No | - | Cloudinary ID |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

---

### 12. DailyReport Collection
**Collection Name**: `dailyreports`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| userId | ObjectId | No | - | Ref to User |
| date | Date | No | - | Report date |
| task | String | No | - | Task description |
| status | String | No | - | Task status |
| createdAt | Date | Auto | now | Creation timestamp |
| updatedAt | Date | Auto | now | Last update timestamp |

---

### 13. CountryTZ Collection
**Collection Name**: `countrytzs`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| _id | ObjectId | Auto | - | Unique identifier |
| name | String | No | - | Country name |
| tz | String | No | - | Timezone |
| code | String | No | - | Country code |

---

## Database Relationships

### One-to-Many Relationships
1. **Branch → Users**: One branch has many users
2. **Branch → Holidays**: One branch has many holidays
3. **User → Attendance**: One user has many attendance records
4. **User → Leaves**: One user has many leave applications
5. **User → Payrolls**: One user has many payroll records
6. **User → FileUploads**: One user has many uploaded files
7. **User → DailyReports**: One user has many daily reports

### Referenced Collections
- User.branch → Branch._id
- Attendance.userId → User._id
- Leave.employee → User._id
- Leave.userId → User._id
- Payroll.userId → User._id
- Payroll.modifiedBy → User._id
- Holiday.branch → Branch._id
- FileUpload.employee → User._id
- DailyReport.userId → User._id
- RefreshToken.userId → User._id
- Notification.performedBy → User._id

---

## Database Indexes Summary

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| users | email | unique | Fast user lookup by email |
| users | first_name, last_name, email, department, designation | text | Full-text search |
| attendances | userName, userEmail | text | Full-text search |
| attendances | {userId, date} | unique compound | Prevent duplicate attendance |
| leaves | userName, userEmail | text | Full-text search |
| branches | branchCode | unique | Fast branch lookup |
| holidays | {date, branch} | unique compound | Prevent duplicate holidays |

---

## Data Denormalization

The schema uses strategic denormalization for performance:
1. **userName, userEmail** in Attendance and Leave collections for fast text search
2. **associatedUsers** count in Branch collection to avoid counting queries
3. **User.uploads[], User.attendance[], User.leaves[]** arrays for bidirectional relationships

---

## Storage Estimates

Assuming 1000 employees:
- Users: ~1000 documents × ~2KB = ~2 MB
- Attendance: ~1000 users × 365 days × ~1KB = ~365 MB/year
- Leaves: ~1000 users × ~20 leaves/year × ~0.5KB = ~10 MB/year
- Payrolls: ~1000 users × 12 months × ~1KB = ~12 MB/year
- Branches: ~10 documents × ~0.5KB = ~5 KB
- Holidays: ~10 branches × ~30 holidays × ~0.5KB = ~150 KB

**Total for 1 year**: ~390 MB (excluding file uploads)

---

**Version**: 1.0  
**Last Updated**: 2024

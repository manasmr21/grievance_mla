# Grievance Management System

A comprehensive backend system for managing academic and hostel grievances in educational institutions, built with NestJS, TypeScript, and PostgreSQL.

## Overview

The Grievance Management System provides a robust platform for students to submit grievances and for staff to manage, track, and resolve them efficiently. The system features intelligent auto-assignment, priority management, and comprehensive audit trails.

## Key Features

- **Smart Grievance Assignment**: Automatic assignment based on grievance type (Academic/Hostel)
- **Role-Based Access Control**: Separate interfaces for students, HODs, wardens, and administrators
- **Priority Management**: Dynamic priority assignment based on hostel type and grievance category
- **SLA Tracking**: Automatic SLA calculation with 24-hour default response time
- **Audit Trail**: Complete tracking of grievance assignments and actions
- **RESTful API**: Well-documented API with Swagger/OpenAPI support
- **JWT Authentication**: Secure token-based authentication
- **Master Data Management**: Comprehensive management of departments, hostels, roles, and categories

## Technology Stack

- **Framework**: NestJS v11.0.1
- **Language**: TypeScript v5.7.3
- **Database**: PostgreSQL
- **ORM**: Sequelize v6.37.8 with Sequelize-TypeScript v2.1.6
- **Authentication**: JWT (Passport + @nestjs/jwt)
- **Password Hashing**: bcrypt v6.0.0
- **API Documentation**: Swagger/OpenAPI
- **CAPTCHA**: svg-captcha v1.4.0

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grievance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=grievance_db

   # Server Configuration
   PORT=8080

   # JWT Configuration
   JWT_SECRET=your_secret_key_here

   # Environment
   NODE_ENV=development
   ```

4. **Set up PostgreSQL database**
   ```bash
   createdb grievance_db
   ```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## Accessing the Application

- **API Base URL**: `http://localhost:8080`
- **Swagger Documentation**: `http://localhost:8080/api/docs`

## Project Structure

```
grievance/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── config/                    # Configuration files
│   ├── auth/                      # JWT authentication
│   ├── common/                    # Shared utilities
│   ├── utils/                     # Helper functions
│   └── modules/                   # Feature modules
│       ├── userAccount/           # User management
│       ├── grievances/            # Core grievance module
│       ├── roles/                 # Role management
│       ├── department/            # Department management
│       ├── hostel/                # Hostel management
│       ├── hostelBlock/           # Block management
│       ├── hostelRoom/            # Room management
│       ├── studentDetails/        # Student information
│       ├── employeeDetails/       # Employee information
│       ├── grievanceCategory/     # Category management
│       ├── grievanceSubCategory/  # Sub-category management
│       ├── ticketStatus/          # Status management
│       ├── ticketPriority/        # Priority management
│       └── captcha/               # CAPTCHA generation
├── .env                           # Environment variables
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── README.md                      # This file
└── ARCHITECTURE.md                # Detailed architecture docs
```

## API Endpoints Overview

### Authentication
- `POST /user-account/register` - Register new user
- `POST /user-account/login` - User login
- `GET /user-account/verify` - Verify JWT token (Protected)

### Grievances
- `POST /grievances` - Submit new grievance
- `GET /grievances` - Get all grievances
- `GET /grievances/:id` - Get specific grievance
- `PATCH /grievances/:id` - Update grievance
- `DELETE /grievances/:id` - Delete grievance
- `PATCH /grievances/:id/assign` - Assign to employee

### Master Data
- `/roles` - Role management
- `/departments` - Department management
- `/hostel`, `/hostel-block`, `/hostel-room` - Hostel management
- `/grievance-category`, `/grievance-sub-category` - Category management
- `/ticket-status`, `/ticket-priority` - Ticket management
- `/student-details`, `/employee-details` - User details

### CAPTCHA
- `GET /captcha/generate` - Generate CAPTCHA
- `POST /captcha/verify` - Verify CAPTCHA

For complete API documentation, visit the Swagger UI at `/api/docs` when the server is running.

## Business Logic Highlights

### Academic Grievance Flow
1. Student submits grievance with department and class
2. System validates student and category
3. Finds HOD from department (default or by role query)
4. Sets priority to MEDIUM
5. Auto-assigns to HOD
6. Creates audit trail entry

### Hostel Grievance Flow
1. Student submits grievance with hostel, block, and room details
2. System validates hostel structure
3. Determines priority (HIGH for special hostels, MEDIUM otherwise)
4. Finds Warden (block warden → hostel warden → role query)
5. Auto-assigns to Warden
6. Creates audit trail entry

### Assignment Rules
- Only HODs and Wardens can reassign grievances
- System validates target employee is active
- Complete audit trail maintained in `grievance_execution` table

### Hostel / Block / Room Cascade Rules
- **Deactivation Cascade**: Deactivating a hostel (e.g. by setting `is_active: false` during deletion) cascades the inactive status to all its corresponding blocks and rooms. Similarly, deactivating a block cascades to all of its rooms.
- **Reactivation Cascade**: When a hostel is reactivated (by updating `is_active: true`), the reactivation automatically cascades to all its corresponding blocks and rooms, updating their `is_active` status to `true` as well.

### Employee Association
- **Bi-Directional Automatic Linkage**: The system automatically maintains consistent associations between employees and their assigned hostels, blocks, or departments, eliminating the need for manual cross-assignment from both ends:
  - **From Hostel / Block / Department Updates**: When a default warden or HOD is assigned during the creation or update of a hostel, block, or department, the respective employee's record is automatically updated to link to that entity.
  - **From Employee Updates**: When an employee is created or updated with a `hostel_id`, `block_id`, or `department_id`, the system automatically updates the corresponding hostel, block, or department's default warden or HOD field to reference this employee (if it was previously null or empty).

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Database Schema

The application uses PostgreSQL with Sequelize ORM. Key entities include:

- **UserAccount**: User authentication and roles
- **StudentDetails**: Student-specific information
- **EmployeeDetails**: Employee-specific information
- **Grievance**: Core grievance entity
- **GrievanceExecution**: Audit trail for assignments
- **Department, Hostel, HostelBlock, HostelRoom**: Organizational structure
- **GrievanceCategory, GrievanceSubCategory**: Classification
- **TicketStatus, TicketPriority**: Workflow management

For detailed database architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive architecture and flow documentation
  - System architecture diagrams
  - Database relationships
  - Flow diagrams for all major processes
  - Detailed module descriptions
  - Security considerations
  - Deployment guidelines

## Development Guidelines

### Code Style
- Follow NestJS best practices
- Use TypeScript strict mode
- Maintain consistent naming conventions
- Document complex business logic

### Git Workflow
- Create feature branches from `main`
- Write meaningful commit messages
- Create pull requests for review

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `your_password` |
| `DB_NAME` | Database name | `grievance_db` |
| `PORT` | Server port | `8080` |
| `JWT_SECRET` | JWT secret key | `your_secret_key` |
| `NODE_ENV` | Environment | `development` |

## Security Considerations

- JWT tokens for authentication
- bcrypt password hashing
- Environment-based configuration
- CORS enabled with configurable origins
- SQL injection protection via Sequelize ORM
- Input validation on all endpoints

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `.env` credentials
- Ensure database exists

### Port Already in Use
- Change `PORT` in `.env`
- Or kill the process using the port

### JWT Authentication Errors
- Verify `JWT_SECRET` is set correctly
- Check token expiration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Acknowledgments

Built with [NestJS](https://nestjs.com/) - A progressive Node.js framework.

---

**Version**: 1.0.0  
**Last Updated**: May 21, 2026  
**Maintained By**: Development Team

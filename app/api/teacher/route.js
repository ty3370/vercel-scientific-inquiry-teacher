import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL);

export const dynamic = 'force-dynamic';

function isAuthenticated(req) {
  return req.cookies.get('teacher_auth')?.value === '1';
}

function unauthorized() {
  return NextResponse.json(
    {
      error: '교사용 인증이 필요합니다.'
    },
    {
      status: 401
    }
  );
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
      const { password } = body;
      const teacherPassword =
        process.env.TEACHER_PASSWORD;

      if (!teacherPassword) {
        return NextResponse.json(
          {
            error:
              'TEACHER_PASSWORD 환경변수가 설정되지 않았습니다.'
          },
          {
            status: 500
          }
        );
      }

      if (password !== teacherPassword) {
        return NextResponse.json(
          {
            error: '비밀번호가 올바르지 않습니다.'
          },
          {
            status: 401
          }
        );
      }

      const response =
        NextResponse.json({
          success: true
        });

      response.cookies.set(
        'teacher_auth',
        '1',
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 8
        }
      );

      return response;
    }

    if (action === 'logout') {
      const response =
        NextResponse.json({
          success: true
        });

      response.cookies.set(
        'teacher_auth',
        '',
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0
        }
      );

      return response;
    }

    if (!isAuthenticated(req)) {
      return unauthorized();
    }

    if (action === 'list_students') {
      const { rows } = await sql`
        SELECT
          number,
          name,
          code,
          current_step,
          total_score,
          initial_hypothesis,
          initial_procedure,
          revised_hypothesis,
          revised_procedure,
          updated_at
        FROM inquiry_sessions
        ORDER BY
          updated_at DESC NULLS LAST,
          number ASC;
      `;

      return NextResponse.json({
        students: rows
      });
    }

    if (action === 'get_student') {
      const {
        number,
        name,
        code
      } = body;

      const { rows } = await sql`
        SELECT *
        FROM inquiry_sessions
        WHERE number = ${number}
          AND name = ${name}
          AND code = ${code}
        LIMIT 1;
      `;

      if (rows.length === 0) {
        return NextResponse.json(
          {
            error:
              '학생 기록을 찾을 수 없습니다.'
          },
          {
            status: 404
          }
        );
      }

      return NextResponse.json({
        student: rows[0]
      });
    }

    if (action === 'delete_student') {
      const {
        number,
        name,
        code
      } = body;

      const result = await sql`
        DELETE FROM inquiry_sessions
        WHERE number = ${number}
          AND name = ${name}
          AND code = ${code};
      `;

      return NextResponse.json({
        success: true,
        deleted:
          result.rowCount || 0
      });
    }

    return NextResponse.json(
      {
        error:
          '알 수 없는 요청입니다.'
      },
      {
        status: 400
      }
    );
  } catch (error) {
    console.error(
      '[Teacher API Error]:',
      error
    );

    return NextResponse.json(
      {
        error: error.message
      },
      {
        status: 500
      }
    );
  }
}

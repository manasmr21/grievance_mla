import { Model } from 'sequelize-typescript';

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export async function paginate<T extends Model>(
  model: any,
  options: any = {},
  page?: number | string,
  limit?: number | string,
): Promise<PaginatedResult<T>> {
  if (page === undefined && limit === undefined) {
    const data = await model.findAll(options);
    return {
      success: true,
      data,
    };
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 10;
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await model.findAndCountAll({
    ...options,
    limit: limitNum,
    offset,
  });

  return {
    success: true,
    data: rows,
    total: count,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(count / limitNum),
  };
}

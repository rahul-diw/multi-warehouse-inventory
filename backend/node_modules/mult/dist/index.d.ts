export declare class Matrix {
    private readonly rows;
    private readonly columns;
    private readonly matrix;
    /**
     * Initialize array from 2d array.
     * @param matrix 2d array
     * @param copy whether to copy the array or not. If copy is false, changing the initial array will change the Matrix.
     */
    constructor(matrix: number[][], copy?: boolean);
    /**
     * Shorthand for new Matrix()
     * @param matrix 2d array
     * @param copy whether to copy the array or not.
     */
    static from(matrix: number[][], copy?: boolean): Matrix;
    /**
     * Initialize empty matrix
     * @param columns number of columns
     * @param rows number of rows
     */
    static empty(rows: number, columns?: number): Matrix;
    /**
     * Initialize matrix of zeros
     * @param columns number of columns
     * @param rows number of rows
     */
    static zeros(rows: number, columns?: number): Matrix;
    /**
     * Initialize matrix of ones
     * @param columns number of columns
     * @param rows number of rows
     */
    static ones(rows: number, columns?: number): Matrix;
    /**
     * Initialize identity matrix
     * @param dimension
     */
    static identity(dimension: number): Matrix;
    /**
     * Initialize a matrix and fill it with a number
     * @param columns number of columns
     * @param rows number of rows
     * @param fill number to fill
     */
    static fill(rows: number, columns: number, fill: number): Matrix;
    private defineProperties;
    get T(): Matrix;
    private static emptyMatrix;
    dot(otherMatrix: Matrix): Matrix;
    add(otherMatrix: Matrix): Matrix;
    subtract(otherMatrix: Matrix): Matrix;
    norm(): number;
    transpose(): Matrix;
    inv(): Matrix;
    det(): number;
    size(): [number, number];
    copy(): Matrix;
    toArray(): number[][];
    toString(): string;
}
/**
 * Multiply to matrices
 * @param a Matrix a
 * @param b Matrix b
 */
export declare function dot(a: Array<Array<number>>, b: Array<Array<number>>): Array<Array<number>>;
/**
 * Subtract two matrices
 * @param matrix1
 * @param matrix2
 */
export declare function subtract(matrix1: Array<Array<number>>, matrix2: Array<Array<number>>): any[];
/**
 * Add two matrices
 * @param matrix1
 * @param matrix2
 */
export declare function add(matrix1: Array<Array<number>>, matrix2: Array<Array<number>>): any[];
/**
 * P norm
 * @param matrix1
 * @param matrix2
 */
export declare function norm(matrix: Array<Array<number>>, p?: number): number;
export declare function transpose(matrix: Array<Array<number>>): number[][];
/**
 * Append vector to matrix
 * @param matrix
 * @param vector
 * @param axis
 * @param inplace
 */
export declare function append(matrix: number[][], vector: number[], axis?: 0 | 1, inplace?: boolean): number[][];
/**
 * Prepend vector to matrix
 * @param matrix
 * @param vector
 * @param axis
 * @param inplace
 */
export declare function prepend(matrix: number[][], vector: number[], axis?: 0 | 1, inplace?: boolean): number[][];
/**
 * LU factorization with partial pivoting
 * @param matrix
 * @param tolerance
 * @return [A: number[][], P: number[]]: Matrix A contains a copy of both matrices L-E and U as A=(L-E)+U
 * such that P*A=L*U. P containing indices where permutation matrix is 1.
 */
export declare function LUPDecompose(matrix: Array<Array<number>> | Matrix, tolerance?: number): [Array<Array<number>>, Array<number>];
/**
 * Solve system of linear equations using LU decomposition.
 * @param matrix
 * @param b
 * @param precision
 * @return x: Solution to Mx=b
 */
export declare function solve(matrix: Array<Array<number>> | Matrix, b: number[], precision?: number): number[];
/**
 * Calculate inverse of matrix
 * @param matrix
 * @param precision
 * @return inverse: The inverse of the matrix
 */
export declare function inverse(matrix: Array<Array<number>>, precision?: number): number[][];
/**
 * Return determinant of matrix
 * @param matrix
 * @return determinant of matrix
 */
export declare function determinant(matrix: Array<Array<number>>): number;
interface Solver {
    weights: any;
    train: Function;
    predict: Function;
}
export declare class LinearRegression implements Solver {
    weights: Array<number>;
    train(X: number[][], y: number[][]): number[];
    predict(X: number[][]): number[][];
}
export {};

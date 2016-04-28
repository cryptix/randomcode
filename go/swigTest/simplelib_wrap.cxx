/* ----------------------------------------------------------------------------
 * This file was automatically generated by SWIG (http://www.swig.org).
 * Version 3.0.3
 *
 * This file is not intended to be easily readable and contains a number of
 * coding conventions designed to improve portability and efficiency. Do not make
 * changes to this file unless you know what you are doing--modify the SWIG
 * interface file instead.
 * ----------------------------------------------------------------------------- */

// source: simplelib.swig

#define SWIGMODULE simplelib

#ifdef __cplusplus
/* SwigValueWrapper is described in swig.swg */
template<typename T> class SwigValueWrapper {
  struct SwigMovePointer {
    T *ptr;
    SwigMovePointer(T *p) : ptr(p) { }
    ~SwigMovePointer() { delete ptr; }
    SwigMovePointer& operator=(SwigMovePointer& rhs) { T* oldptr = ptr; ptr = 0; delete oldptr; ptr = rhs.ptr; rhs.ptr = 0; return *this; }
  } pointer;
  SwigValueWrapper& operator=(const SwigValueWrapper<T>& rhs);
  SwigValueWrapper(const SwigValueWrapper<T>& rhs);
public:
  SwigValueWrapper() : pointer(0) { }
  SwigValueWrapper& operator=(const T& t) { SwigMovePointer tmp(new T(t)); pointer = tmp; return *this; }
  operator T&() const { return *pointer.ptr; }
  T *operator&() { return pointer.ptr; }
};

template <typename T> T SwigValueInit() {
  return T();
}
#endif

/* -----------------------------------------------------------------------------
 *  This section contains generic SWIG labels for method/variable
 *  declarations/attributes, and other compiler dependent labels.
 * ----------------------------------------------------------------------------- */

/* template workaround for compilers that cannot correctly implement the C++ standard */
#ifndef SWIGTEMPLATEDISAMBIGUATOR
# if defined(__SUNPRO_CC) && (__SUNPRO_CC <= 0x560)
#  define SWIGTEMPLATEDISAMBIGUATOR template
# elif defined(__HP_aCC)
/* Needed even with `aCC -AA' when `aCC -V' reports HP ANSI C++ B3910B A.03.55 */
/* If we find a maximum version that requires this, the test would be __HP_aCC <= 35500 for A.03.55 */
#  define SWIGTEMPLATEDISAMBIGUATOR template
# else
#  define SWIGTEMPLATEDISAMBIGUATOR
# endif
#endif

/* inline attribute */
#ifndef SWIGINLINE
# if defined(__cplusplus) || (defined(__GNUC__) && !defined(__STRICT_ANSI__))
#   define SWIGINLINE inline
# else
#   define SWIGINLINE
# endif
#endif

/* attribute recognised by some compilers to avoid 'unused' warnings */
#ifndef SWIGUNUSED
# if defined(__GNUC__)
#   if !(defined(__cplusplus)) || (__GNUC__ > 3 || (__GNUC__ == 3 && __GNUC_MINOR__ >= 4))
#     define SWIGUNUSED __attribute__ ((__unused__))
#   else
#     define SWIGUNUSED
#   endif
# elif defined(__ICC)
#   define SWIGUNUSED __attribute__ ((__unused__))
# else
#   define SWIGUNUSED
# endif
#endif

#ifndef SWIG_MSC_UNSUPPRESS_4505
# if defined(_MSC_VER)
#   pragma warning(disable : 4505) /* unreferenced local function has been removed */
# endif
#endif

#ifndef SWIGUNUSEDPARM
# ifdef __cplusplus
#   define SWIGUNUSEDPARM(p)
# else
#   define SWIGUNUSEDPARM(p) p SWIGUNUSED
# endif
#endif

/* internal SWIG method */
#ifndef SWIGINTERN
# define SWIGINTERN static SWIGUNUSED
#endif

/* internal inline SWIG method */
#ifndef SWIGINTERNINLINE
# define SWIGINTERNINLINE SWIGINTERN SWIGINLINE
#endif

/* exporting methods */
#if (__GNUC__ >= 4) || (__GNUC__ == 3 && __GNUC_MINOR__ >= 4)
#  ifndef GCC_HASCLASSVISIBILITY
#    define GCC_HASCLASSVISIBILITY
#  endif
#endif

#ifndef SWIGEXPORT
# if defined(_WIN32) || defined(__WIN32__) || defined(__CYGWIN__)
#   if defined(STATIC_LINKED)
#     define SWIGEXPORT
#   else
#     define SWIGEXPORT __declspec(dllexport)
#   endif
# else
#   if defined(__GNUC__) && defined(GCC_HASCLASSVISIBILITY)
#     define SWIGEXPORT __attribute__ ((visibility("default")))
#   else
#     define SWIGEXPORT
#   endif
# endif
#endif

/* calling conventions for Windows */
#ifndef SWIGSTDCALL
# if defined(_WIN32) || defined(__WIN32__) || defined(__CYGWIN__)
#   define SWIGSTDCALL __stdcall
# else
#   define SWIGSTDCALL
# endif
#endif

/* Deal with Microsoft's attempt at deprecating C standard runtime functions */
#if !defined(SWIG_NO_CRT_SECURE_NO_DEPRECATE) && defined(_MSC_VER) && !defined(_CRT_SECURE_NO_DEPRECATE)
# define _CRT_SECURE_NO_DEPRECATE
#endif

/* Deal with Microsoft's attempt at deprecating methods in the standard C++ library */
#if !defined(SWIG_NO_SCL_SECURE_NO_DEPRECATE) && defined(_MSC_VER) && !defined(_SCL_SECURE_NO_DEPRECATE)
# define _SCL_SECURE_NO_DEPRECATE
#endif



#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>



typedef long long intgo;
typedef unsigned long long uintgo;



typedef struct { char *p; intgo n; } _gostring_;
typedef struct { void* array; intgo len; intgo cap; } _goslice_;




#define swiggo_size_assert_eq(x, y, name) typedef char name[(x-y)*(x-y)*-2+1];
#define swiggo_size_assert(t, n) swiggo_size_assert_eq(sizeof(t), n, swiggo_sizeof_##t##_is_not_##n)

swiggo_size_assert(char, 1)
swiggo_size_assert(short, 2)
swiggo_size_assert(int, 4)
typedef long long swiggo_long_long;
swiggo_size_assert(swiggo_long_long, 8)
swiggo_size_assert(float, 4)
swiggo_size_assert(double, 8)

#ifdef __cplusplus
extern "C" {
#endif
extern void crosscall2(void (*fn)(void *, int), void *, int);
extern char* _cgo_topofstack(void) __attribute__ ((weak));
extern void _cgo_allocate(void *, int);
extern void _cgo_panic(void *, int);
#ifdef __cplusplus
}
#endif

static char *_swig_topofstack() {
  if (_cgo_topofstack) {
    return _cgo_topofstack();
  } else {
    return 0;
  }
}

static void *_swig_goallocate(size_t len) {
  struct {
    size_t len;
    void *ret;
  } a;
  a.len = len;
  crosscall2(_cgo_allocate, &a, (int) sizeof a);
  return a.ret;
}

static void _swig_gopanic(const char *p) {
  struct {
    const char *p;
  } a;
  a.p = p;
  crosscall2(_cgo_panic, &a, (int) sizeof a);
}




static _gostring_ _swig_makegostring(const char *p, size_t l) {
  _gostring_ ret;
  ret.p = (char*)_swig_goallocate(l + 1);
  memcpy(ret.p, p, l);
  ret.n = l;
  return ret;
}

#define SWIG_contract_assert(expr, msg) \
  if (!(expr)) { _swig_gopanic(msg); } else


#include <string>


#include <vector>
#include <stdexcept>

SWIGINTERN std::vector< std::string >::const_reference std_vector_Sl_std_string_Sg__get(std::vector< std::string > *self,int i){
                int size = int(self->size());
                if (i>=0 && i<size)
                    return (*self)[i];
                else
                    throw std::out_of_range("vector index out of range");
            }
SWIGINTERN void std_vector_Sl_std_string_Sg__set(std::vector< std::string > *self,int i,std::vector< std::string >::value_type const &val){
                int size = int(self->size());
                if (i>=0 && i<size)
                    (*self)[i] = val;
                else
                    throw std::out_of_range("vector index out of range");
            }
SWIGINTERN std::vector< char >::const_reference std_vector_Sl_char_Sg__get(std::vector< char > *self,int i){
                int size = int(self->size());
                if (i>=0 && i<size)
                    return (*self)[i];
                else
                    throw std::out_of_range("vector index out of range");
            }
SWIGINTERN void std_vector_Sl_char_Sg__set(std::vector< char > *self,int i,std::vector< char >::value_type const &val){
                int size = int(self->size());
                if (i>=0 && i<size)
                    (*self)[i] = val;
                else
                    throw std::out_of_range("vector index out of range");
            }
#ifdef __cplusplus
extern "C" {
#endif

void
_wrap_new_StringVector__SWIG_0(void *swig_v)
{
  std::vector< std::string > *result = 0 ;
  std::vector< std::string > *_swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    long : 0;
    std::vector< std::string > *result;
  } *swig_a = (struct swigargs *) swig_v;
  
  
  swig_stktop = _swig_topofstack();
  result = (std::vector< std::string > *)new std::vector< std::string >();
  *(std::vector< std::string > **)&_swig_go_result = (std::vector< std::string > *)result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_new_StringVector__SWIG_1(void *swig_v)
{
  std::vector< std::string >::size_type arg1 ;
  std::vector< std::string > *result = 0 ;
  long long _swig_go_0;
  std::vector< std::string > *_swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    long long arg1;
    long : 0;
    std::vector< std::string > *result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = (size_t)_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = (std::vector< std::string > *)new std::vector< std::string >(arg1);
  *(std::vector< std::string > **)&_swig_go_result = (std::vector< std::string > *)result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_StringVector_size(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  std::vector< std::string >::size_type result;
  std::vector< std::string > *_swig_go_0;
  long long _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< std::string > *arg1;
    long : 0;
    long long result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = ((std::vector< std::string > const *)arg1)->size();
  _swig_go_result = result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_StringVector_capacity(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  std::vector< std::string >::size_type result;
  std::vector< std::string > *_swig_go_0;
  long long _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< std::string > *arg1;
    long : 0;
    long long result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = ((std::vector< std::string > const *)arg1)->capacity();
  _swig_go_result = result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_StringVector_reserve(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  std::vector< std::string >::size_type arg2 ;
  std::vector< std::string > *_swig_go_0;
  long long _swig_go_1;
  
  struct swigargs {
    std::vector< std::string > *arg1;
    long long arg2;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  arg2 = (size_t)_swig_go_1; 
  
  (arg1)->reserve(arg2);
  
}


void
_wrap_StringVector_isEmpty(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  bool result;
  std::vector< std::string > *_swig_go_0;
  bool _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< std::string > *arg1;
    long : 0;
    bool result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = (bool)((std::vector< std::string > const *)arg1)->empty();
  _swig_go_result = result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_StringVector_clear(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  std::vector< std::string > *_swig_go_0;
  
  struct swigargs {
    std::vector< std::string > *arg1;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  
  (arg1)->clear();
  
}


void
_wrap_StringVector_add(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  std::vector< std::string >::value_type *arg2 = 0 ;
  std::vector< std::string > *_swig_go_0;
  _gostring_ _swig_go_1;
  
  struct swigargs {
    std::vector< std::string > *arg1;
    _gostring_ arg2;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  
  std::vector< std::string >::value_type arg2_str(_swig_go_1.p, _swig_go_1.n);
  arg2 = &arg2_str;
  
  
  (arg1)->push_back((std::vector< std::string >::value_type const &)*arg2);
  
}


void
_wrap_StringVector_get(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  int arg2 ;
  std::vector< std::string >::value_type *result = 0 ;
  std::vector< std::string > *_swig_go_0;
  intgo _swig_go_1;
  _gostring_ _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< std::string > *arg1;
    intgo arg2;
    long : 0;
    _gostring_ result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  arg2 = (int)_swig_go_1; 
  
  swig_stktop = _swig_topofstack();
  try {
    result = (std::vector< std::string >::value_type *) &std_vector_Sl_std_string_Sg__get(arg1,arg2);
  }
  catch(std::out_of_range &_e) {
    (void)_e;
    _swig_gopanic("C++ std::out_of_range exception thrown");
    
  }
  
  _swig_go_result = _swig_makegostring((*result).data(), (*result).length()); 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_StringVector_set(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  int arg2 ;
  std::vector< std::string >::value_type *arg3 = 0 ;
  std::vector< std::string > *_swig_go_0;
  intgo _swig_go_1;
  _gostring_ _swig_go_2;
  
  struct swigargs {
    std::vector< std::string > *arg1;
    intgo arg2;
    _gostring_ arg3;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  _swig_go_2 = swig_a->arg3;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  arg2 = (int)_swig_go_1; 
  
  std::vector< std::string >::value_type arg3_str(_swig_go_2.p, _swig_go_2.n);
  arg3 = &arg3_str;
  
  
  try {
    std_vector_Sl_std_string_Sg__set(arg1,arg2,(std::string const &)*arg3);
  }
  catch(std::out_of_range &_e) {
    (void)_e;
    _swig_gopanic("C++ std::out_of_range exception thrown");
    
  }
  
  
}


void
_wrap_delete_StringVector(void *swig_v)
{
  std::vector< std::string > *arg1 = (std::vector< std::string > *) 0 ;
  std::vector< std::string > *_swig_go_0;
  
  struct swigargs {
    std::vector< std::string > *arg1;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< std::string > **)&_swig_go_0; 
  
  delete arg1;
  
}


void
_wrap_new_ByteVector__SWIG_0(void *swig_v)
{
  std::vector< char > *result = 0 ;
  std::vector< char > *_swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    long : 0;
    std::vector< char > *result;
  } *swig_a = (struct swigargs *) swig_v;
  
  
  swig_stktop = _swig_topofstack();
  result = (std::vector< char > *)new std::vector< char >();
  *(std::vector< char > **)&_swig_go_result = (std::vector< char > *)result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_new_ByteVector__SWIG_1(void *swig_v)
{
  std::vector< char >::size_type arg1 ;
  std::vector< char > *result = 0 ;
  long long _swig_go_0;
  std::vector< char > *_swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    long long arg1;
    long : 0;
    std::vector< char > *result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = (size_t)_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = (std::vector< char > *)new std::vector< char >(arg1);
  *(std::vector< char > **)&_swig_go_result = (std::vector< char > *)result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_ByteVector_size(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  std::vector< char >::size_type result;
  std::vector< char > *_swig_go_0;
  long long _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< char > *arg1;
    long : 0;
    long long result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = ((std::vector< char > const *)arg1)->size();
  _swig_go_result = result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_ByteVector_capacity(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  std::vector< char >::size_type result;
  std::vector< char > *_swig_go_0;
  long long _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< char > *arg1;
    long : 0;
    long long result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = ((std::vector< char > const *)arg1)->capacity();
  _swig_go_result = result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_ByteVector_reserve(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  std::vector< char >::size_type arg2 ;
  std::vector< char > *_swig_go_0;
  long long _swig_go_1;
  
  struct swigargs {
    std::vector< char > *arg1;
    long long arg2;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  arg2 = (size_t)_swig_go_1; 
  
  (arg1)->reserve(arg2);
  
}


void
_wrap_ByteVector_isEmpty(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  bool result;
  std::vector< char > *_swig_go_0;
  bool _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< char > *arg1;
    long : 0;
    bool result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = (bool)((std::vector< char > const *)arg1)->empty();
  _swig_go_result = result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_ByteVector_clear(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  std::vector< char > *_swig_go_0;
  
  struct swigargs {
    std::vector< char > *arg1;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  
  (arg1)->clear();
  
}


void
_wrap_ByteVector_add(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  std::vector< char >::value_type *arg2 = 0 ;
  std::vector< char > *_swig_go_0;
  char _swig_go_1;
  
  struct swigargs {
    std::vector< char > *arg1;
    char arg2;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  arg2 = (std::vector< char >::value_type *)&_swig_go_1; 
  
  (arg1)->push_back((std::vector< char >::value_type const &)*arg2);
  
}


void
_wrap_ByteVector_get(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  int arg2 ;
  std::vector< char >::value_type *result = 0 ;
  std::vector< char > *_swig_go_0;
  intgo _swig_go_1;
  char _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    std::vector< char > *arg1;
    intgo arg2;
    long : 0;
    char result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  arg2 = (int)_swig_go_1; 
  
  swig_stktop = _swig_topofstack();
  try {
    result = (std::vector< char >::value_type *) &std_vector_Sl_char_Sg__get(arg1,arg2);
  }
  catch(std::out_of_range &_e) {
    (void)_e;
    _swig_gopanic("C++ std::out_of_range exception thrown");
    
  }
  
  _swig_go_result = (char)*result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_ByteVector_set(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  int arg2 ;
  std::vector< char >::value_type *arg3 = 0 ;
  std::vector< char > *_swig_go_0;
  intgo _swig_go_1;
  char _swig_go_2;
  
  struct swigargs {
    std::vector< char > *arg1;
    intgo arg2;
    char arg3;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  _swig_go_2 = swig_a->arg3;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  arg2 = (int)_swig_go_1; 
  arg3 = (std::vector< char >::value_type *)&_swig_go_2; 
  
  try {
    std_vector_Sl_char_Sg__set(arg1,arg2,(char const &)*arg3);
  }
  catch(std::out_of_range &_e) {
    (void)_e;
    _swig_gopanic("C++ std::out_of_range exception thrown");
    
  }
  
  
}


void
_wrap_delete_ByteVector(void *swig_v)
{
  std::vector< char > *arg1 = (std::vector< char > *) 0 ;
  std::vector< char > *_swig_go_0;
  
  struct swigargs {
    std::vector< char > *arg1;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(std::vector< char > **)&_swig_go_0; 
  
  delete arg1;
  
}


void
_wrap_new_SimpleClass(void *swig_v)
{
  SimpleClass *result = 0 ;
  SimpleClass *_swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    long : 0;
    SimpleClass *result;
  } *swig_a = (struct swigargs *) swig_v;
  
  
  swig_stktop = _swig_topofstack();
  result = (SimpleClass *)new SimpleClass();
  *(SimpleClass **)&_swig_go_result = (SimpleClass *)result; 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_SimpleClass_hello(void *swig_v)
{
  SimpleClass *arg1 = (SimpleClass *) 0 ;
  std::string result;
  SimpleClass *_swig_go_0;
  _gostring_ _swig_go_result;
  char *swig_stktop;
  
  struct swigargs {
    SimpleClass *arg1;
    long : 0;
    _gostring_ result;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(SimpleClass **)&_swig_go_0; 
  
  swig_stktop = _swig_topofstack();
  result = (arg1)->hello();
  _swig_go_result = _swig_makegostring((&result)->data(), (&result)->length()); 
  swig_a = (struct swigargs*)((char*)swig_a + (_swig_topofstack() - swig_stktop));
  swig_a->result = _swig_go_result;
}


void
_wrap_SimpleClass_helloString(void *swig_v)
{
  SimpleClass *arg1 = (SimpleClass *) 0 ;
  std::vector< std::string > arg2 ;
  std::vector< std::string > *argp2 ;
  SimpleClass *_swig_go_0;
  std::vector< std::string > *_swig_go_1;
  
  struct swigargs {
    SimpleClass *arg1;
    std::vector< std::string > *arg2;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(SimpleClass **)&_swig_go_0; 
  
  argp2 = (std::vector< std::string > *)_swig_go_1;
  if (argp2 == NULL) {
    _swig_gopanic("Attempt to dereference null std::vector< std::string >");
  }
  arg2 = (std::vector< std::string >)*argp2;
  
  
  (arg1)->helloString(arg2);
  
}


void
_wrap_SimpleClass_helloBytes(void *swig_v)
{
  SimpleClass *arg1 = (SimpleClass *) 0 ;
  std::vector< char > arg2 ;
  std::vector< char > *argp2 ;
  SimpleClass *_swig_go_0;
  std::vector< char > *_swig_go_1;
  
  struct swigargs {
    SimpleClass *arg1;
    std::vector< char > *arg2;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  _swig_go_1 = swig_a->arg2;
  arg1 = *(SimpleClass **)&_swig_go_0; 
  
  argp2 = (std::vector< char > *)_swig_go_1;
  if (argp2 == NULL) {
    _swig_gopanic("Attempt to dereference null std::vector< char >");
  }
  arg2 = (std::vector< char >)*argp2;
  
  
  (arg1)->helloBytes(arg2);
  
}


void
_wrap_delete_SimpleClass(void *swig_v)
{
  SimpleClass *arg1 = (SimpleClass *) 0 ;
  SimpleClass *_swig_go_0;
  
  struct swigargs {
    SimpleClass *arg1;
  } *swig_a = (struct swigargs *) swig_v;
  
  _swig_go_0 = swig_a->arg1;
  arg1 = *(SimpleClass **)&_swig_go_0; 
  
  delete arg1;
  
}


#ifdef __cplusplus
}
#endif
